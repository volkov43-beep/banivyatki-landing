<?php
/** Дополнительные сценарии handler.test.php. Все отправки идут в локальную заглушку. */
declare(strict_types=1);

function routeTestConfig(array $overrides): void
{
    global $priv, $configPhp;
    // Сохраняем тот же тестовый конфиг с тем же loopback-вебхуком.
    $source = str_replace('return [', 'return ' . var_export($overrides, true) . ' + [', $configPhp);
    file_put_contents("$priv/config.php", $source);
}

function runRouteRetry(): int
{
    global $priv;
    exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg("$priv/retry.php") . ' 2>&1', $output, $rc);
    return $rc;
}

resetStub('deal_error');
[$status, $body] = post(lead(['crm_target' => 'lead', 'contact_id' => 999]));
$files = queueFiles();
check('ошибка сделки: HTTP ok и одна запись', $status === 200 && $body === '{"ok":true}' && count($files) === 1);
$routeFile = $files[0];
$saved = json_decode(file_get_contents($routeFile), true);
check('маршрут по умолчанию сохранён, клиент не задаёт маршрут или контакт',
    $saved['lead']['crm_target'] === 'deal' && $saved['lead']['contact_id'] === 101);

// Одновременно в очереди: новый deal, старая заявка, старая заявка после создания контакта.
$legacy = $saved;
unset($legacy['lead']['crm_target'], $legacy['lead']['contact_id'], $legacy['lead']['contact_found']);
file_put_contents("$priv/queue/route-old.json", json_encode($legacy));
$legacy['lead']['contact_id'] = 77;
$legacy['lead']['contact_found'] = true;
file_put_contents("$priv/queue/route-old-contact.json", json_encode($legacy));

routeTestConfig(['crm_target' => 'lead']);
resetStub('deal_error');
check('смена конфига: retry работает для обеих версий очереди', runRouteRetry() === 0 && count(queueFiles()) === 3);
$calls = stubCalls();
check('только одна пара поиска и создания контакта, три попытки сделки',
    count($calls) === 5 && count(array_filter($calls, static fn ($call) => str_starts_with($call, 'crm.deal.add '))) === 3);
foreach (queueFiles() as $file) {
    $entry = json_decode(file_get_contents($file), true);
    check('повторная ошибка сохраняет deal и contact_id: ' . basename($file),
        $entry['lead']['crm_target'] === 'deal' && $entry['lead']['contact_id'] === (str_contains($file, 'old-contact') ? 77 : 101)
        && $entry['last_error'] === 'deal:bitrix_INVALID_CREDENTIALS');
}

$invalidRecords = [];
foreach (['lead', 'unexpected', '', null, false, 1, ['deal']] as $index => $target) {
    $record = $saved;
    $record['lead']['crm_target'] = $target;
    $name = "route-invalid-$index.json";
    $invalidRecords[$name] = json_encode($record);
    file_put_contents("$priv/queue/$name", $invalidRecords[$name]);
}
routeTestConfig(['crm_target' => 'typo']);
resetStub('ok');
check('повреждённая настройка новых заявок не останавливает смешанную очередь',
    runRouteRetry() === 0 && queueFiles() === []);
$calls = stubCalls();
check('только три сохранённые сделки, без повторного поиска или создания контактов',
    count($calls) === 3 && count(array_filter($calls, static fn ($call) => str_starts_with($call, 'crm.deal.add '))) === 3);
foreach ($invalidRecords as $name => $original) {
    check("запись $name сохранена без изменения в failed", @file_get_contents("$priv/queue/failed/$name") === $original);
}

// Не подменять предыдущую запись в failed при совпадении имени и не сообщать об успешном переносе.
$name = 'route-invalid-0.json';
file_put_contents("$priv/queue/$name", $invalidRecords['route-invalid-1.json']);
resetStub('ok');
check('конфликт имён failed: обе записи сохранены, REST не вызывался',
    runRouteRetry() === 1 && file_get_contents("$priv/queue/$name") === $invalidRecords['route-invalid-1.json']
    && file_get_contents("$priv/queue/failed/$name") === $invalidRecords[$name]
    && str_contains(logText(), 'reason=quarantine_failed') && stubCalls() === []);
unlink("$priv/queue/$name");
// Тесты старого лимита попыток ниже используют пустой failed.
foreach (array_keys($invalidRecords) as $name) {
    unlink("$priv/queue/failed/$name");
}

foreach (['lead', 'typo', null] as $index => $target) {
    routeTestConfig(['crm_target' => $target]);
    resetStub('ok');
    [$status, $body] = post(lead());
    check("настройка маршрута #$index отклонена до REST и очереди", $status === 500
        && $body === '{"ok":false,"error":"server_config"}' && stubCalls() === [] && queueFiles() === []);
}

routeTestConfig(['crm_target' => 'deal']);
resetStub('ok');
[$status, $body] = post(lead());
check('явная настройка deal: прежний ответ и три REST-вызова', $status === 200 && $body === '{"ok":true}' && count(stubCalls()) === 3);
routeTestConfig([]);

// При ревью с эталоном: экспортировать server/lib.php и server/retry.php из
// базового коммита и передать каталог этих двух файлов в BV_CRM_BASELINE_DIR.
$baselineDir = getenv('BV_CRM_BASELINE_DIR');
if ($baselineDir !== false && $baselineDir !== '') {
    foreach (['lib.php', 'retry.php'] as $name) {
        if (!is_file("$baselineDir/$name")) {
            throw new RuntimeException("Missing baseline $name");
        }
    }
    // Старый и новый код получают один и тот же HTTP-запрос на локальный сервер.
    $forms = [
        lead(), lead(['form' => 'business', 'company' => 'Тест']),
        lead(['form' => 'visit', 'visit_type' => 'showroom']), lead(['form' => 'faq_question', 'question' => 'Тест?']),
        lead(['form' => 'final']), catalogLead('podkova-45'), quizLead(),
    ];
    $baselineCalls = [];
    foreach (['old' => $baselineDir, 'new' => "$root/server"] as $version => $dir) {
        copy("$dir/lib.php", "$priv/lib.php");
        foreach ($forms as $input) {
            foreach (['ok', 'found'] as $mode) {
                resetStub($mode);
                [$status, $body] = post($input);
                $key = $input['form'] . '/' . $mode;
                $calls = stubCalls();
                check("эталон $version $key: успешная сделка", $status === 200 && $body === '{"ok":true}'
                    && count($calls) === ($mode === 'found' ? 2 : 3) && str_starts_with(end($calls), 'crm.deal.add '));
                if ($version === 'old') {
                    $baselineCalls[$key] = $calls;
                } else {
                    check("байты всех REST-запросов $key совпали с базой", $calls === $baselineCalls[$key]);
                }
            }
        }
    }

    foreach ([['new', 'old'], ['old', 'new']] as [$library, $worker]) {
        copy(($library === 'old' ? $baselineDir : "$root/server") . '/lib.php', "$priv/lib.php");
        copy(($worker === 'old' ? $baselineDir : "$root/server") . '/retry.php', "$priv/retry.php");
        routeTestConfig(['crm_target' => 'lead']);
        $untagged = $legacy; // Сохранённый contact_id, исторический формат.
        $blocked = $saved;
        $blocked['lead']['crm_target'] = 'lead';
        $blocked['attempts'] = 9; // Для старого worker это последняя попытка.
        file_put_contents("$priv/queue/compat-old.json", json_encode($untagged));
        file_put_contents("$priv/queue/compat-deal.json", json_encode($saved));
        file_put_contents("$priv/queue/compat-blocked.json", json_encode($blocked));
        resetStub('ok');
        $rc = runRouteRetry();
        $calls = stubCalls();
        check("lib=$library worker=$worker: отправлены ровно две сделки по сохранённым контактам", $rc === 0
            && count($calls) === 2 && str_starts_with($calls[0], 'crm.deal.add ') && str_starts_with($calls[1], 'crm.deal.add ')
            && queueFiles() === [] && is_file("$priv/queue/failed/compat-blocked.json"));
        unlink("$priv/queue/failed/compat-blocked.json");
    }
    copy("$root/server/lib.php", "$priv/lib.php");
    copy("$root/server/retry.php", "$priv/retry.php");
    routeTestConfig([]);
}
