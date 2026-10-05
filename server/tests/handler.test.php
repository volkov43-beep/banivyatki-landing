<?php
/**
 * Проверка обработчика lead.php и retry.php с заглушкой Битрикса (без сети).
 * Запуск из корня репозитория: php server/tests/handler.test.php
 *
 * Собирает во временной папке структуру как на сервере:
 *   site/public_html/api/lead.php, site/private/{lib.php,config.php,retry.php}
 * поднимает php -S для сайта (8090), для заглушки Битрикса (8091) и для
 * папки private (8092 — проверка, что retry.php по HTTP не работает).
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$tmp = sys_get_temp_dir() . '/bv-handler-' . bin2hex(random_bytes(3));
$site = "$tmp/site";
$pub = "$site/public_html";
$priv = "$site/private";
$stub = "$tmp/stub";
foreach (["$pub/api", $priv, $stub] as $d) {
    mkdir($d, 0750, true);
}
copy("$root/public/api/lead.php", "$pub/api/lead.php");
copy("$root/server/lib.php", "$priv/lib.php");
copy("$root/server/retry.php", "$priv/retry.php");

$configPhp = <<<'PHP'
<?php
return [
    'webhook_url' => 'http://127.0.0.1:8091/rest/1/stubkey/',
    'portal_url' => 'http://127.0.0.1:8091',
    'assigned_by_id' => 1,
    'deal_category_id' => 0,
    'deal_stage_id' => 'NEW',
    'source_site' => 'WEB',
    'source_direct' => 'DIRECT',
    'contact_method_field' => 'UF_CRM_METHOD',
    'contact_method_call' => '11',
    'contact_method_max' => '12',
    'deal_utm_fields' => ['utm_source' => 'UTM_SOURCE', 'utm_medium' => 'UTM_MEDIUM', 'utm_campaign' => 'UTM_CAMPAIGN', 'utm_content' => 'UTM_CONTENT', 'utm_term' => 'UTM_TERM'],
    'contact_utm_fields' => ['utm_source' => 'UTM_SOURCE', 'utm_medium' => 'UTM_MEDIUM', 'utm_campaign' => '', 'utm_content' => '', 'utm_term' => ''],
    'client_ip_header' => 'HTTP_X_TEST_IP',
];
PHP;
file_put_contents("$priv/config.php", $configPhp);

function startServer(string $cmd, array $env = []): array
{
    $proc = proc_open($cmd, [0 => ['file', '/dev/null', 'r'], 1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes, null, $env + getenv());
    usleep(400000);
    return [$proc];
}
// opcache выключен: тест подменяет config.php чаще, чем раз в 2 секунды
$php = 'php -d opcache.enable=0 ';
[$srvSite] = startServer($php . '-S 127.0.0.1:8090 -t ' . escapeshellarg($pub));
[$srvStub] = startServer($php . '-S 127.0.0.1:8091 ' . escapeshellarg("$root/server/tests/bitrix-stub.php"), ['BV_STUB_DIR' => $stub]);
[$srvPriv] = startServer($php . '-S 127.0.0.1:8092 -t ' . escapeshellarg($priv));

register_shutdown_function(static function () use ($srvSite, $srvStub, $srvPriv, $tmp): void {
    foreach ([$srvSite, $srvStub, $srvPriv] as $p) {
        proc_terminate($p, 15);
        proc_close($p);
    }
    exec('rm -rf ' . escapeshellarg($tmp));
});

function http(string $method, string $url, ?string $body = null, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_HTTPHEADER => $headers]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $out = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return [$code, (string) $out];
}

$ipSeq = 0;
function post(array $data, array $headers = [], ?string $rawBody = null): array
{
    global $ipSeq;
    $ipSeq++;
    // заголовки по имени: переданные заменяют умолчания, а не дублируют их
    $map = ['Content-Type' => 'application/json', 'Origin' => 'https://banivyatki.ru', 'X-Test-IP' => '10.0.0.' . $ipSeq];
    foreach ($headers as $line) {
        [$k, $v] = array_map('trim', explode(':', $line, 2) + [1 => '']);
        $map[$k] = $v;
    }
    $h = [];
    foreach ($map as $k => $v) {
        $h[] = $v === '' ? "$k;" : "$k: $v"; // «Имя;» в curl — отправить пустой заголовок; пустой Origin ниже заменяем на удаление
    }
    $h = array_values(array_filter($h, static fn ($l) => !str_ends_with($l, ';')));
    return http('POST', 'http://127.0.0.1:8090/api/lead.php', $rawBody ?? json_encode($data, JSON_UNESCAPED_UNICODE), $h);
}

function lead(array $extra = []): array
{
    return $extra + [
        'form' => 'calculator', 'name' => 'Тест', 'phone' => '+7 912 345-67-89', 'contact_method' => 'call',
        'option_shown' => '4–4,5 м, тёплый сезон', 'price_shown' => 330000, 'page_url' => 'https://banivyatki.ru/',
        'utm_source' => 'yandex', 'utm_medium' => 'cpc', 'utm_campaign' => 'test', 'referrer' => 'https://yandex.ru/',
        'elapsed_ms' => 8000, 'website' => '', 'submitted_at' => '2026-10-05T11:12:00.000Z',
    ];
}

$failed = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failed;
    if (!$ok) {
        $failed++;
    }
    echo ($ok ? 'ok   ' : 'FAIL ') . $name . ($detail !== '' && !$ok ? "  [$detail]" : '') . "\n";
}
function stubCalls(): array
{
    global $stub;
    return array_values(array_filter(explode("\n", (string) @file_get_contents("$stub/calls.log"))));
}
function resetStub(string $mode): void
{
    global $stub;
    file_put_contents("$stub/mode", $mode);
    @unlink("$stub/calls.log");
}
function queueFiles(): array
{
    global $priv;
    return glob("$priv/queue/*.json") ?: [];
}
function logText(): string
{
    global $priv;
    return implode('', array_map('file_get_contents', glob("$priv/log/*.log") ?: []));
}

resetStub('ok');

// --- метод, origin, JSON ---
[$c, $b] = http('GET', 'http://127.0.0.1:8090/api/lead.php');
check('GET → 405', $c === 405 && str_contains($b, '"error":"method_not_allowed"'), "$c $b");
[$c, $b] = post(lead(), ['Origin: https://evil.example']);
check('чужой Origin → 403', $c === 403, "$c $b");
[$c, $b] = post([], [], '{not json');
check('не JSON → 400', $c === 400 && str_contains($b, 'bad_json'), "$c $b");
[$c, $b] = post(lead(), ['Origin: https://www.banivyatki.ru']);
check('Origin www → 200', $c === 200 && $b === '{"ok":true}', "$c $b");
[$c, $b] = post(lead(), ['Origin:']);  // без Origin — тоже можно
check('без Origin → 200', $c === 200, "$c $b");

// --- ловушка и скорость: успех снаружи, в Битрикс ничего ---
resetStub('ok');
[$c, $b] = post(lead(['website' => 'http://spam']));
check('ловушка → 200 ok, без вызовов Битрикса', $c === 200 && $b === '{"ok":true}' && stubCalls() === [], "$c $b " . count(stubCalls()));
[$c, $b] = post(lead(['elapsed_ms' => 1200]));
check('elapsed_ms < 3000 → 200 ok, без вызовов', $c === 200 && $b === '{"ok":true}' && stubCalls() === [], "$c $b");
[$c, $b] = post(lead(['elapsed_ms' => null]));
check('elapsed_ms отсутствует → 200 ok, без вызовов', $c === 200 && stubCalls() === [], "$c $b");

// --- обязательные поля и телефон ---
[$c, $b] = post(lead(['phone' => '']));
check('нет телефона → 400', $c === 400 && str_contains($b, 'bad_request'), "$c $b");
[$c, $b] = post(lead(['form' => '']));
check('нет form → 400', $c === 400, "$c $b");
[$c, $b] = post(lead(['form' => 'unknown']));
check('неизвестная form → 400', $c === 400, "$c $b");
[$c, $b] = post(lead(['phone' => '12345']));
check('мусорный телефон → 400 bad_phone, без вызовов', $c === 400 && str_contains($b, 'bad_phone') && stubCalls() === [], "$c $b");

// --- успешная отправка: три вызова, поля ---
resetStub('ok');
[$c, $b] = post(lead(['phone' => '8 (912) 345-67-89']));
$calls = stubCalls();
check('успех → 200 {"ok":true}', $c === 200 && $b === '{"ok":true}', "$c $b");
check('три вызова: findbycomm, contact.add, deal.add', count($calls) === 3 && str_starts_with($calls[0], 'crm.duplicate.findbycomm') && str_starts_with($calls[1], 'crm.contact.add') && str_starts_with($calls[2], 'crm.deal.add'), implode(' | ', array_map(static fn ($s) => substr($s, 0, 30), $calls)));
$find = json_decode(substr($calls[0], strlen('crm.duplicate.findbycomm ')), true);
check('поиск по PHONE +7…, CONTACT', ($find['type'] ?? '') === 'PHONE' && ($find['values'][0] ?? '') === '+79123456789' && ($find['entity_type'] ?? '') === 'CONTACT', json_encode($find));
$contact = json_decode(substr($calls[1], strlen('crm.contact.add ')), true)['fields'] ?? [];
check('контакт: NAME, PHONE WORK, ASSIGNED, OPENED, UTM', ($contact['NAME'] ?? '') === 'Тест' && ($contact['PHONE'][0]['VALUE'] ?? '') === '+79123456789' && ($contact['PHONE'][0]['VALUE_TYPE'] ?? '') === 'WORK' && ($contact['ASSIGNED_BY_ID'] ?? 0) === 1 && ($contact['OPENED'] ?? '') === 'Y' && ($contact['UTM_SOURCE'] ?? '') === 'yandex' && !isset($contact['UTM_CAMPAIGN']), json_encode($contact, JSON_UNESCAPED_UNICODE));
$deal = json_decode(substr($calls[2], strlen('crm.deal.add ')), true)['fields'] ?? [];
check('сделка: TITLE по шаблону', ($deal['TITLE'] ?? '') === 'Сайт · Расчёт · 4–4,5 м, тёплый сезон · от 330 000 ₽', $deal['TITLE'] ?? '');
check('сделка: категория, стадия, контакт, источник Директ, описание, тип связи', ($deal['CATEGORY_ID'] ?? null) === 0 && ($deal['STAGE_ID'] ?? '') === 'NEW' && ($deal['CONTACT_ID'] ?? 0) === 101 && ($deal['SOURCE_ID'] ?? '') === 'DIRECT' && ($deal['SOURCE_DESCRIPTION'] ?? '') === 'Калькулятор' && ($deal['UF_CRM_METHOD'] ?? '') === '11' && ($deal['UTM_CAMPAIGN'] ?? '') === 'test' && !isset($deal['OPPORTUNITY']), json_encode($deal, JSON_UNESCAPED_UNICODE));
$expectedComments = "Форма: Калькулятор\nВыбранный вариант: 4–4,5 м, тёплый сезон\nПоказанная цена: от 330 000 ₽\nСпособ связи: Звонок\nСтраница: https://banivyatki.ru/\nПереход с: https://yandex.ru/\nВремя отправки: 05.10.2026 14:12 (МСК)\nМетки: utm_source=yandex, utm_medium=cpc, utm_campaign=test";
check('сделка: COMMENTS построчно, время по МСК', ($deal['COMMENTS'] ?? '') === $expectedComments, json_encode($deal['COMMENTS'] ?? '', JSON_UNESCAPED_UNICODE));
check('журнал: sent, deal=555, без телефона и имени', str_contains(logText(), 'result=sent deal=555 contact=101:new') && !str_contains(logText(), '9123456789') && !str_contains(logText(), 'Тест'), logText());

// --- остальные формы: названия и источник «сайт» ---
resetStub('ok');
post(lead(['form' => 'visit', 'visit_type' => 'showroom', 'utm_source' => 'google', 'contact_method' => 'max', 'price_shown' => null, 'option_shown' => '']));
$deal = json_decode(substr(stubCalls()[2], strlen('crm.deal.add ')), true)['fields'];
check('visit: «Сайт · Запись: шоурум», источник сайта, тип визита, MAX', $deal['TITLE'] === 'Сайт · Запись: шоурум' && $deal['SOURCE_ID'] === 'WEB' && str_contains($deal['COMMENTS'], "Тип визита: Шоурум") && $deal['UF_CRM_METHOD'] === '12' && $deal['SOURCE_DESCRIPTION'] === 'Запись на просмотр', json_encode($deal, JSON_UNESCAPED_UNICODE));
resetStub('ok');
post(lead(['form' => 'faq_question', 'question' => 'Сколько ждать?', 'price_shown' => null, 'option_shown' => '', 'name' => '']));
$calls = stubCalls();
$deal = json_decode(substr($calls[2], strlen('crm.deal.add ')), true)['fields'];
$contact = json_decode(substr($calls[1], strlen('crm.contact.add ')), true)['fields'];
check('faq: «Сайт · Вопрос», вопрос в комментарии, имя «Клиент с сайта»', $deal['TITLE'] === 'Сайт · Вопрос' && str_contains($deal['COMMENTS'], "Вопрос: Сколько ждать?") && $contact['NAME'] === 'Клиент с сайта', $deal['TITLE'] . ' / ' . $contact['NAME']);
resetStub('ok');
post(lead(['form' => 'final', 'price_shown' => null, 'option_shown' => '']));
$deal = json_decode(substr(stubCalls()[2], strlen('crm.deal.add ')), true)['fields'];
check('final: «Сайт · Расчёт», «Форма внизу страницы»', $deal['TITLE'] === 'Сайт · Расчёт' && $deal['SOURCE_DESCRIPTION'] === 'Форма внизу страницы', $deal['TITLE']);
resetStub('ok');
post(lead(['form' => 'calc', 'price_shown' => null]));
$deal = json_decode(substr(stubCalls()[2], strlen('crm.deal.add ')), true)['fields'];
check('calc без цены: «Сайт · Расчёт · 4–4,5 м, тёплый сезон» (псевдоним calc)', $deal['TITLE'] === 'Сайт · Расчёт · 4–4,5 м, тёплый сезон', $deal['TITLE']);

// --- повторное обращение ---
resetStub('found');
post(lead());
$calls = stubCalls();
$deal = json_decode(substr($calls[1], strlen('crm.deal.add ')), true)['fields'] ?? [];
check('контакт найден: два вызова, без contact.add, «Повторное обращение» со ссылкой', count($calls) === 2 && str_starts_with($calls[1], 'crm.deal.add') && str_starts_with($deal['COMMENTS'] ?? '', "Повторное обращение: http://127.0.0.1:8091/crm/contact/details/77/\n") && ($deal['CONTACT_ID'] ?? 0) === 77, json_encode($deal['COMMENTS'] ?? '', JSON_UNESCAPED_UNICODE));

// --- ошибка Битрикса → очередь, сайту успех ---
resetStub('error');
$before = count(queueFiles());
[$c, $b] = post(lead());
check('ошибка Битрикса → 200 ok, заявка в очереди', $c === 200 && $b === '{"ok":true}' && count(queueFiles()) === $before + 1 && str_contains(logText(), 'result=queued error=find:bitrix_INVALID_CREDENTIALS'), "$c $b queue=" . count(queueFiles()));
$job = json_decode(file_get_contents(queueFiles()[0]), true);
check('файл очереди: attempts=1, заявка с нормализованным телефоном', ($job['attempts'] ?? 0) === 1 && ($job['lead']['phone'] ?? '') === '+79123456789', json_encode($job));

// --- таймаут Битрикса → очередь ---
resetStub('timeout');
$t = microtime(true);
[$c, $b] = post(lead());
$dt = microtime(true) - $t;
check('таймаут Битрикса (10 с) → 200 ok, в очереди', $c === 200 && $b === '{"ok":true}' && count(queueFiles()) === $before + 2 && $dt < 14 && str_contains(logText(), 'error=find:curl_28'), sprintf('%d %s %.1fs', $c, $b, $dt));

// --- retry.php: по HTTP не работает ---
[$c, $b] = http('GET', 'http://127.0.0.1:8092/retry.php');
check('retry.php по HTTP → 404 и пустой ответ', $c === 404 && trim($b) === '', "$c $b");

// --- retry.php из CLI: очередь уходит в Битрикс ---
resetStub('ok');
exec('php ' . escapeshellarg("$priv/retry.php") . ' 2>&1', $out, $rc);
check('retry из CLI: очередь пуста, отправлено 2', $rc === 0 && count(queueFiles()) === 0 && str_contains(implode("\n", $out), 'отправлено 2') && str_contains(logText(), 'attempts=2 queue='), implode("\n", $out));

// --- retry: после 10 попыток — в failed ---
resetStub('error');
post(lead());
$file = queueFiles()[0];
$job = json_decode(file_get_contents($file), true);
$job['attempts'] = 9;
file_put_contents($file, json_encode($job));
exec('php ' . escapeshellarg("$priv/retry.php") . ' 2>&1', $out2, $rc2);
check('retry: 10-я неудачная попытка → queue/failed, запись в журнале', count(queueFiles()) === 0 && count(glob("$priv/queue/failed/*.json") ?: []) === 1 && str_contains(logText(), 'result=failed error=find:bitrix_INVALID_CREDENTIALS attempts=10'), implode("\n", $out2));

// --- retry: блокировка от второго экземпляра ---
resetStub('timeout');
post(lead());
$p1 = proc_open('php ' . escapeshellarg("$priv/retry.php"), [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes1);
usleep(500000);
exec('php ' . escapeshellarg("$priv/retry.php") . ' 2>&1', $out3, $rc3);
check('второй retry при работающем первом сразу выходит', str_contains(implode("\n", $out3), 'уже запущен'), implode("\n", $out3));
proc_terminate($p1, 9);
proc_close($p1);
resetStub('ok');
exec('php ' . escapeshellarg("$priv/retry.php") . ' >/dev/null 2>&1');

// --- лимит частоты: 5 за 10 минут с одного IP ---
resetStub('ok');
$codes = [];
for ($i = 0; $i < 6; $i++) {
    [$c] = post(lead(), ['X-Test-IP: 203.0.113.7']);
    $codes[] = $c;
}
check('6-я заявка с одного IP → 429', $codes === [200, 200, 200, 200, 200, 429], implode(',', $codes));

// --- старые журналы удаляются ---
file_put_contents("$priv/log/2026-01-01.log", "old\n");
exec('php ' . escapeshellarg("$priv/retry.php") . ' >/dev/null 2>&1');
check('retry удаляет журнал старше 30 дней', !file_exists("$priv/log/2026-01-01.log"));

// --- нет конфига: ошибка без путей ---
rename("$priv/config.php", "$priv/config.php.off");
[$c, $b] = post(lead());
check('нет конфига → 500 server_config, без путей в ответе', $c === 500 && $b === '{"ok":false,"error":"server_config"}' && !str_contains($b, '/'), "$c $b");
file_put_contents("$priv/config.php", "<?php\nreturn [ 'webhook_url' => ''];");
[$c, $b] = post(lead());
check('конфиг неполный → 500 server_config', $c === 500 && str_contains($b, 'server_config'), "$c $b");
file_put_contents("$priv/config.php", "<?php\nthis is not php");
[$c, $b] = post(lead());
check('конфиг с синтаксической ошибкой → 500 server_error, без белого экрана и путей', $c === 500 && $b === '{"ok":false,"error":"server_error"}', "$c $b");
rename("$priv/config.php.off", "$priv/config.php");
unlink("$priv/lib.php");
[$c, $b] = post(lead());
check('нет lib.php → 500 server_config', $c === 500 && $b === '{"ok":false,"error":"server_config"}', "$c $b");

echo $failed === 0 ? "\nВсе проверки обработчика прошли\n" : "\nПровалено: $failed\n";
exit($failed === 0 ? 0 : 1);
