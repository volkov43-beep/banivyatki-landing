<?php
/** Invoked only by lead-v3-fixture.py with a temporary, synthetic HTTPS endpoint. */
declare(strict_types=1);
require_once dirname(__DIR__) . '/lead-v3.php';
[$script, $root, $port] = $argv;
$dir = "$root/queue";
$cfg = ['webhook_url' => "https://127.0.0.1:$port/rest/17/fixture-token/",
    'lead_v3' => ['source_site' => 'TEST_WEB', 'source_direct' => 'TEST_AD', 'phone_type' => 'WORK',
        'assigned_by_id' => 17, 'stage_id' => 'TEST_STAGE', 'custom' => [
            'contact_method' => ['field' => 'UF_CRM_TEST_METHOD', 'values' => ['call' => 11, 'telegram' => 12]],
            'catalog_model' => ['field' => 'UF_CRM_TEST_MODEL', 'values' => ['podkova-45' => 21]],
        ]]];
if (isset($argv[3])) {
    if (isset($argv[4])) {
        // Inject a real store-path failure in this child only, before or after rename.
        if (function_exists('fsync')) {
            exit(2);
        }
        function fsync($stream): bool
        {
            global $argv;
            return $argv[4] === 'directory' && (fstat($stream)['mode'] & 0170000) !== 0040000;
        }
        try {
            bv_v3_attempt($dir, $cfg, $argv[3]);
        } catch (RuntimeException $e) {
            exit($e->getMessage() === 'lead_v3_storage' ? 0 : 2);
        }
        exit(2);
    }
    exit(bv_v3_attempt($dir, $cfg, $argv[3])['state'] === 'sent' ? 0 : 1);
}
$count = 0;
function expect(bool $value, string $label): void
{
    global $count;
    if (!$value) {
        fwrite(STDERR, "FAIL lead-v3 $label\n");
        exit(1);
    }
    $count++;
}
function inspectCalls(): array
{
    global $root;
    return array_map(static fn($s) => json_decode($s, true, flags: JSON_THROW_ON_ERROR), file("$root/calls"));
}
function job(string $key): array
{
    global $dir;
    return json_decode(file_get_contents("$dir/$key.json"), true, flags: JSON_THROW_ON_ERROR);
}
function worker(string $key, ?string $failSync = null)
{
    global $root, $port;
    $cmd = [PHP_BINARY, '-d', "curl.cainfo=$root/cert.pem", '-d', "error_log=$root/diagnostics"];
    if ($failSync !== null) {
        array_push($cmd, '-d', 'disable_functions=fsync');
    }
    array_push($cmd, __FILE__, $root, $port, $key);
    if ($failSync !== null) {
        $cmd[] = $failSync;
    }
    return proc_open($cmd, [], $pipes);
}
function awaitRequest(int $before): void
{
    for ($i = 0; $i < 200 && count(inspectCalls()) === $before; $i++) {
        usleep(20000);
    }
    expect(count(inspectCalls()) === $before + 1, 'fixture received first worker request');
}
function backdate(string $key, int $age): array
{
    global $cfg, $dir;
    $old = job($key);
    $op = &$old['lead']['v3_operation'];
    $op['created'] = time() - $age;
    $op['seal'] = bv_v3_seal(bv_v3_endpoint($cfg), $key, $op['created'], $op['body']);
    $old['created_at'] = date('c', $op['created']);
    bv_v3_store("$dir/$key.json", $old);
    return $old;
}
function mode(string $name): void
{
    global $root;
    file_put_contents("$root/mode", $name);
}
function rejects(callable $call, string $label): void
{
    try {
        $call();
    } catch (InvalidArgumentException) {
        expect(true, $label);
        return;
    }
    expect(false, $label);
}

$inputs = [
    'calculator' => ['option_shown' => 'Вариант', 'price_shown' => 420000],
    'business' => ['option_shown' => 'Вариант', 'price_shown' => 420000, 'company' => 'Фирма'],
    'visit' => ['visit_type' => 'showroom'], 'faq_question' => ['question' => 'Когда?'],
    'final' => ['comment' => 'Перезвоните'], 'catalog' => ['catalog_model' => 'podkova-45'],
    'quiz' => ['quiz_version' => 'v1', 'quiz_place' => 'ready', 'quiz_area' => 'medium_45', 'quiz_features' => 'year_round,terrace',
        'quiz_timing' => 'one_three_months', 'quiz_budget' => '420_570', 'contact_method' => 'telegram'],
];
$details = ['calculator' => 'Показанная цена: от 420 000 ₽', 'business' => 'Компания: Фирма',
    'visit' => 'Тип визита: Шоурум', 'faq_question' => 'Вопрос: Когда?', 'final' => 'Комментарий: Перезвоните',
    'catalog' => 'Интересующая модель: Подкова 4,5 м', 'quiz' => 'Бюджет: 420–570 тыс. ₽'];
foreach ($inputs as $form => $input) {
    $raw = $input + ['form' => $form, 'name' => 'PRIVATE-SENTINEL', 'phone' => '8 (900) 000-00-01',
        'contact_method' => 'call', 'page_url' => 'https://banivyatki.ru/syktyvkar/',
        'submitted_at' => '2026-11-01T10:00:00Z', 'utm_source' => 'YANDEX', 'utm_medium' => 'CPC',
        'utm_campaign' => 'campaign', 'utm_content' => 'content', 'utm_term' => 'term'];
    expect(bv_form_name($form) === $form && bv_catalog_valid($raw, $form) && bv_quiz_valid($raw, $form), "$form validation");
    $lead = bv_build_lead($raw, bv_normalize_phone($raw['phone']), $form);
    $key = bv_v3_prepare($dir, $cfg, $lead);
    $saved = job($key);
    expect($saved['attempts'] === 0 && $saved['lead']['crm_target'] === 'lead' && $saved['lead']['v3_operation']['key'] === $key, "$form queued before send");
    expect(!str_contains(json_encode($saved), 'fixture-token'), "$form credentials absent from record");
    $res = bv_v3_attempt($dir, $cfg, $key);
    expect($res['state'] === 'sent' && $res['id'] > 0 && !$res['replayed'], "$form success (" . $res['reason'] . ")");
    $calls = inspectCalls();
    [$wireKey, $digest, $wire] = end($calls);
    $expected = ['title' => bv_deal_title($lead), 'phone' => [['valueTypeId' => 'WORK', 'value' => '+79000000001']],
        'sourceId' => 'TEST_AD', 'sourceDescription' => BV_FORMS[$form]['label'], 'comments' => bv_deal_comments([], $lead, false, null),
        'name' => 'PRIVATE-SENTINEL', 'utm' => ['source' => 'YANDEX', 'medium' => 'CPC', 'campaign' => 'campaign', 'content' => 'content', 'term' => 'term'],
        'assignedById' => 17, 'stageId' => 'TEST_STAGE', 'UF_CRM_TEST_METHOD' => $form === 'quiz' ? 12 : 11];
    if ($form === 'catalog') {
        $expected['UF_CRM_TEST_MODEL'] = 21;
    }
    expect($wire === ['fields' => $expected] && $wireKey === $key
        && $digest === hash('sha256', $saved['lead']['v3_operation']['body']), "$form complete wire payload");
    $comments = $wire['fields']['comments'];
    expect(str_contains($comments, $details[$form]) && str_contains($comments, 'Сыктывкар / Республика Коми')
        && str_contains($comments, 'Способ связи: ') && str_contains($comments, $raw['page_url']), "$form scenario / region / URL");
    expect(bv_v3_attempt($dir, $cfg, $key) === $res && count(inspectCalls()) === count($calls), "$form sent is terminal");
}

$minimal = $cfg;
unset($minimal['lead_v3']['assigned_by_id'], $minimal['lead_v3']['stage_id'], $minimal['lead_v3']['custom']);
$plain = array_replace($lead, ['name' => ''], array_fill_keys(BV_UTM_KEYS, ''));
$f = bv_v3_fields($minimal, $plain);
expect($f['sourceId'] === 'TEST_WEB' && !isset($f['name']) && !isset($f['utm'])
    && !isset($f['assignedById']) && !isset($f['stageId']) && !isset($f['UF_CRM_TEST_METHOD']), 'site source, optional omissions');
$f = bv_v3_fields($minimal, array_replace($plain, ['name' => str_repeat('И', 60)]));
expect(mb_strlen($f['name']) === 50 && str_contains($f['comments'], str_repeat('И', 60)), 'long name preserved in comment');
$invalid = $cfg;
$invalid['lead_v3']['custom']['contact_method']['field'] = 'assignedById';
rejects(fn() => bv_v3_prepare($dir, $invalid, $lead), 'custom cannot overwrite standard field');
$invalid = $cfg;
unset($invalid['lead_v3']['source_direct']);
rejects(fn() => bv_v3_prepare($dir, $invalid, $lead), 'missing dictionary code');
rejects(fn() => bv_v3_prepare($dir, $cfg, $lead + ['crm_target' => 'deal']), 'old route not reinterpreted');
foreach (['http://example.invalid/rest/1/x/', 'https://example.invalid/rest/1/x/?query=test', 'https://user@example.invalid/rest/1/x/'] as $bad) {
    rejects(fn() => bv_v3_endpoint(['webhook_url' => $bad]), 'invalid webhook URL');
}
foreach (['auth' => 'authentication', 'scope' => 'scope', 'rights' => 'permission', 'validation' => 'validation',
    'unknown_rate' => 'unconfirmed_response', 'server' => 'unconfirmed_response', 'no_echo' => 'unconfirmed_response', 'bad_response' => 'unconfirmed_response'] as $fixture => $reason) {
    mode($fixture);
    $key = bv_v3_prepare($dir, $cfg, $lead);
    expect(bv_v3_attempt($dir, $cfg, $key) === ['state' => 'review', 'reason' => $reason], "$fixture classified");
    $n = count(inspectCalls());
    expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'review' && count(inspectCalls()) === $n, "$fixture no automatic repeat");
}

// A definite rate-limit error is not cached by the mock. Changed field config cannot alter the body.
mode('rate');
$key = bv_v3_prepare($dir, $cfg, $lead);
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'retry', '429 retryable');
mode('ok');
expect(bv_v3_attempt($dir, $minimal, $key)['state'] === 'sent', 'queue after config change');
$calls = inspectCalls();
expect($calls[count($calls) - 1] === $calls[count($calls) - 2], 'same key and bytes after field settings change');
$rotated = $cfg;
$rotated['webhook_url'] = str_replace('fixture-token', 'rotated-token', $cfg['webhook_url']);
$key = bv_v3_prepare($dir, $cfg, $lead);
$n = count(inspectCalls());
expect(bv_v3_attempt($dir, $rotated, $key)['reason'] === 'scope_or_snapshot_changed' && count(inspectCalls()) === $n, 'changed webhook blocked');

foreach (['lost' => 'transport', 'timeout' => 'timeout'] as $fixture => $reason) {
    mode($fixture);
    $key = bv_v3_prepare($dir, $cfg, $lead);
    expect(bv_v3_attempt($dir, $cfg, $key) === ['state' => 'review', 'reason' => $reason], "$fixture indeterminate");
    $n = count(inspectCalls());
    expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'review' && count(inspectCalls()) === $n, "$fixture held for review");
    if ($fixture === 'timeout') {
        for ($i = 0; $i < 60 && !is_file("$root/finished-$key"); $i++) {
            usleep(100000);
        }
        expect(is_file("$root/finished-$key"), 'fixture confirms first request finished');
    }
    mode('ok');
    $res = bv_v3_attempt($dir, $minimal, $key, confirmedReplay: true);
    expect($res['state'] === 'sent' && $res['replayed'], "$fixture confirmed replay from CRM cache");
    $calls = inspectCalls();
    expect($calls[count($calls) - 1] === $calls[count($calls) - 2], "$fixture byte identical replay");
}

// Bypass the local snapshot check only in this test to exercise the remote 422 contract.
expect(bv_v3_post(bv_v3_endpoint($cfg), $key, '{"fields":{"title":"different"}}')['reason'] === 'key_reused', 'remote 422 on different body');
$n = count(inspectCalls());
$key = bv_v3_prepare($dir, $cfg, $lead);
$changed = job($key);
$changed['lead']['v3_operation']['body'] .= ' ';
bv_v3_store("$dir/$key.json", $changed);
expect(bv_v3_attempt($dir, $cfg, $key)['reason'] === 'scope_or_snapshot_changed' && count(inspectCalls()) === $n, 'changed local bytes never sent');
// Preparation is not a POST. A lost first response on a days-old ready row has a fresh replay window.
mode('lost');
$key = bv_v3_prepare($dir, $cfg, $lead);
$old = backdate($key, 3 * 86400);
$start = time();
expect(bv_v3_attempt($dir, $cfg, $key)['reason'] === 'transport', 'old unsent ready allowed');
$saved = job($key);
$anchor = $saved['delivery']['possible_since'];
expect($anchor >= $start && $saved['attempts'] === 1 && count(inspectCalls()) === $n + 1, 'window starts at first possible POST');
mode('replay_rate');
expect(bv_v3_attempt($dir, $cfg, $key, true)['state'] === 'review'
    && job($key)['delivery']['possible_since'] === $anchor, 'later 429 cannot clear prior uncertainty');
mode('ok');
$n = count(inspectCalls());
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'review' && count(inspectCalls()) === $n, 'no blind retry after ambiguous history');
$res = bv_v3_attempt($dir, $cfg, $key, true);
$calls = inspectCalls();
expect($res['state'] === 'sent' && $res['replayed'] && end($calls) === $calls[count($calls) - 3], 'manual replay of old preparation uses original bytes and key');
expect(bv_v3_attempt($dir, $rotated, $key, true) === $res && count(inspectCalls()) === count($calls), 'sent terminal even after credential change');

foreach ([false, true] as $legacy) {
    foreach ([86401, 86400 - 240] as $age) {
        $key = bv_v3_prepare($dir, $cfg, $lead);
        $old = backdate($key, $age + 60);
        $old['attempts'] = 1;
        $old['delivery'] = ['state' => 'review', 'reason' => 'timeout'];
        if (!$legacy) {
            $old['delivery']['possible_since'] = time() - $age;
        }
        bv_v3_store("$dir/$key.json", $old);
        $n = count(inspectCalls());
        expect(bv_v3_attempt($dir, $cfg, $key, true)['reason'] === 'window' && count(inspectCalls()) === $n, 'expired or margin, current and legacy clocks');
    }
}

// Confirmed rejections are distinct from a lost response, even when the row is old.
mode('rate');
$key = bv_v3_prepare($dir, $cfg, $lead);
backdate($key, 3 * 86400);
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'retry' && bv_v3_attempt($dir, $cfg, $key)['state'] === 'retry', 'only confirmed rejections');
$saved = job($key);
expect(array_key_exists('possible_since', $saved['delivery']) && $saved['delivery']['possible_since'] === null, 'clean retry has no possible creation');
mode('ok');
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'sent', 'old confirmed rejections permit same operation');
$calls = inspectCalls();
expect(end($calls) === $calls[count($calls) - 3], 'clean retries preserve wire bytes');

foreach ([
    [['state' => 'ready', 'reason' => 'prepared'], 1, 'invalid_state'],
    [['state' => 'retry', 'reason' => 'rate_limit'], 2, 'interrupted'],
    [['state' => 'sending', 'reason' => 'in_flight'], 1, 'interrupted'],
    [['state' => 'review', 'reason' => 'transport', 'possible_since' => null], 1, 'invalid_state'],
    [['state' => 'review', 'reason' => 'transport', 'possible_since' => time() + 86400], 1, 'window'],
] as [$delivery, $attempts, $reason]) {
    $key = bv_v3_prepare($dir, $cfg, $lead);
    $row = job($key);
    $row['delivery'] = $delivery;
    $row['attempts'] = $attempts;
    bv_v3_store("$dir/$key.json", $row);
    $n = count(inspectCalls());
    expect(bv_v3_attempt($dir, $cfg, $key, true)['reason'] === $reason && count(inspectCalls()) === $n, 'legacy or inconsistent history held');
}

mode('lost');
foreach (['credentials', 'body'] as $change) {
    $key = bv_v3_prepare($dir, $cfg, $lead);
    expect(bv_v3_attempt($dir, $cfg, $key)['reason'] === 'transport', "$change initial uncertain result");
    if ($change === 'body') {
        $row = job($key);
        $row['lead']['v3_operation']['body'] .= ' ';
        bv_v3_store("$dir/$key.json", $row);
    }
    $n = count(inspectCalls());
    expect(bv_v3_attempt($dir, $change === 'body' ? $cfg : $rotated, $key, true)['reason'] === 'scope_or_snapshot_changed'
        && count(inspectCalls()) === $n, "$change blocks a replay");
}

$key = bv_v3_prepare($dir, $cfg, $lead);
file_put_contents("$dir/$key.json", '{"broken":');
$n = count(inspectCalls());
expect(bv_v3_attempt($dir, $cfg, $key, true)['reason'] === 'invalid_record' && file_get_contents("$dir/$key.json") === '{"broken":'
    && count(inspectCalls()) === $n, 'corrupt record preserved without dispatch');
foreach (['file' => 'ready', 'directory' => 'sending'] as $fail => $state) {
    $key = bv_v3_prepare($dir, $cfg, $lead);
    expect(proc_close(worker($key, $fail)) === 0 && job($key)['delivery']['state'] === $state
        && count(inspectCalls()) === $n, "$fail fsync failed before HTTPS");
}
expect(bv_v3_attempt($dir, $cfg, $key)['reason'] === 'interrupted' && count(inspectCalls()) === $n, 'visible sending after directory-sync failure is held');

// A failed lock open or a concurrently running pre-REV worker must prevent any POST.
$key = bv_v3_prepare($dir, $cfg, $lead);
$lockPath = "$dir/.lead-v3-$key.lock";
mkdir($lockPath);
try {
    bv_v3_attempt($dir, $cfg, $key);
    expect(false, 'lock open must fail');
} catch (RuntimeException $e) {
    expect($e->getMessage() === 'lead_v3_lock' && count(inspectCalls()) === $n && job($key)['attempts'] === 0, 'lock failure is closed');
}
rmdir($lockPath);
$oldLock = fopen("$dir/.lead-v3.lock", 'c');
expect(flock($oldLock, LOCK_EX | LOCK_NB), 'legacy worker acquired exclusive spool lock');
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'busy' && count(inspectCalls()) === $n, 'legacy worker excludes REV');
fclose($oldLock);

// Kill a real CLI worker while its POST is outstanding. A second process cannot send or steal its lock.
mode('hold');
$proc = worker($key);
awaitRequest($n);
$inode = fileinode($lockPath);
$sending = job($key);
expect($sending['delivery']['state'] === 'sending' && $sending['attempts'] === 1 && is_int($sending['delivery']['possible_since']), 'durable sending visible during POST');
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'busy' && count(inspectCalls()) === $n + 1, 'same key guarded between PHP processes');
$oldLock = fopen("$dir/.lead-v3.lock", 'c');
expect(!flock($oldLock, LOCK_EX | LOCK_NB), 'REV also excludes legacy worker');
fclose($oldLock);
expect(proc_terminate($proc, 9), 'interrupt actual worker');
proc_close($proc);
expect(bv_v3_attempt($dir, $cfg, $key, true)['reason'] === 'interrupted'
    && job($key)['delivery']['possible_since'] === $sending['delivery']['possible_since'], 'crash recovery preserves original window');
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'review' && count(inspectCalls()) === $n + 1, 'one POST despite contention and crash');
touch("$root/release-$key");
for ($i = 0; $i < 100 && !is_file("$root/finished-$key"); $i++) {
    usleep(20000);
}
expect(is_file("$root/finished-$key"), 'first remote execution completed');
mode('ok');
expect(bv_v3_attempt($dir, $cfg, $key, true)['replayed'] === true, 'operator replay after crash retrieves cached result');
clearstatcache(true, $lockPath);
expect(fileinode($lockPath) === $inode && $inode !== false, 'lock inode stable across recovery');

// Both handlers must be inside the HTTPS fixture together to pass its two-party barrier.
mode('overlap');
$left = bv_v3_prepare($dir, $cfg, $lead);
$right = bv_v3_prepare($dir, $cfg, $lead);
$n = count(inspectCalls());
$one = worker($left);
$two = worker($right);
$rc1 = proc_close($one);
$rc2 = proc_close($two);
expect($rc1 === 0 && $rc2 === 0 && count(inspectCalls()) === $n + 2, 'two independent workers both sent');
[$a, $b] = json_decode(file_get_contents("$root/interval-$left"), true, flags: JSON_THROW_ON_ERROR);
[$c, $d] = json_decode(file_get_contents("$root/interval-$right"), true, flags: JSON_THROW_ON_ERROR);
expect(max($a, $c) < min($b, $d) && job($left)['delivery']['id'] !== job($right)['delivery']['id'], 'measured overlap of independent HTTPS requests');

// Feed a real prepared record to a private copy of the existing worker, never its live queue.
$legacy = "$root/legacy";
mkdir("$legacy/queue", 0700, true);
copy(dirname(__DIR__) . '/retry.php', "$legacy/retry.php");
copy(dirname(__DIR__) . '/lib.php', "$legacy/lib.php");
$dealConfig = $cfg + ['assigned_by_id' => 1, 'source_site' => 'TEST', 'deal_category_id' => 0, 'deal_stage_id' => 'TEST'];
file_put_contents("$legacy/config.php", "<?php return " . var_export($dealConfig, true) . ";");
$another = bv_v3_prepare($dir, $cfg, $lead);
expect($another !== $key, 'independent business submission gets new key');
copy("$dir/$another.json", "$legacy/queue/test.json");
$n = count(inspectCalls());
exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg("$legacy/retry.php"), $lines, $rc);
expect($rc === 0 && is_file("$legacy/queue/failed/test.json")
    && file_get_contents("$legacy/queue/failed/test.json") === file_get_contents("$dir/$another.json")
    && count(inspectCalls()) === $n, 'existing worker quarantines the complete v3 record unchanged without REST');

$log = file_get_contents("$root/diagnostics");
expect(str_contains($log, 'lead_v3 review validation') && str_contains($log, 'lead_v3 sent confirmed'), 'diagnostic events recorded');
foreach (['fixture-token', '/rest/', 'PRIVATE-SENTINEL', '+79000000001', 'Когда?', '127.0.0.1', $key] as $secret) {
    expect(!str_contains($log, $secret), 'diagnostic redaction');
}
echo "Lead REST v3: $count checks passed (local HTTPS).\n";
