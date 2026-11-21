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
    'server' => 'unconfirmed_response', 'no_echo' => 'unconfirmed_response', 'bad_response' => 'unconfirmed_response'] as $fixture => $reason) {
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
foreach ([24 * 3600 + 1, 24 * 3600 - 240] as $age) {
    $key = bv_v3_prepare($dir, $cfg, $lead);
    $old = job($key);
    $op = &$old['lead']['v3_operation'];
    $op['created'] = time() - $age;
    $op['seal'] = bv_v3_seal(bv_v3_endpoint($cfg), $key, $op['created'], $op['body']);
    unset($op);
    $old['delivery'] = ['state' => 'review', 'reason' => 'timeout'];
    bv_v3_store("$dir/$key.json", $old);
    expect(bv_v3_attempt($dir, $cfg, $key, true)['reason'] === 'window' && count(inspectCalls()) === $n, 'expired operation never sent');
}
$key = bv_v3_prepare($dir, $cfg, $lead);
$inFlight = job($key);
$inFlight['delivery'] = ['state' => 'sending', 'reason' => 'in_flight'];
bv_v3_store("$dir/$key.json", $inFlight);
expect(bv_v3_attempt($dir, $cfg, $key)['reason'] === 'interrupted' && count(inspectCalls()) === $n, 'crash after sending marker needs review');

// Two CLI processes share the same operation. The second cannot even start its transport.
mode('slow');
$key = bv_v3_prepare($dir, $cfg, $lead);
$cmd = [PHP_BINARY, '-d', "curl.cainfo=$root/cert.pem", '-d', "error_log=$root/diagnostics", __FILE__, $root, $port, $key];
$proc = proc_open($cmd, [], $pipes);
for ($i = 0; $i < 100 && count(inspectCalls()) === $n; $i++) {
    usleep(20000);
}
expect(bv_v3_attempt($dir, $cfg, $key)['state'] === 'busy', 'parallel attempt held');
expect(proc_close($proc) === 0 && count(inspectCalls()) === $n + 1 && job($key)['delivery']['state'] === 'sent', 'one request from two workers');


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
