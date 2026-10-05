<?php
/**
 * Заглушка REST Битрикс24 для локальных проверок обработчика.
 * Запуск: BV_STUB_DIR=<папка> php -S 127.0.0.1:8091 server/tests/bitrix-stub.php
 * Режим берётся из файла <папка>/mode: ok | found | error | timeout.
 * Каждый вызов дописывается в <папка>/calls.log: метод и тело запроса.
 */

declare(strict_types=1);

$dir = getenv('BV_STUB_DIR') ?: sys_get_temp_dir();
$mode = trim((string) @file_get_contents($dir . '/mode')) ?: 'ok';
$method = basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '.json');
$body = file_get_contents('php://input');
file_put_contents($dir . '/calls.log', $method . ' ' . $body . PHP_EOL, FILE_APPEND);

header('Content-Type: application/json');

if ($mode === 'timeout') {
    sleep(12);
    echo '{"result":1}';
    exit;
}
if ($mode === 'error') {
    http_response_code(401);
    echo json_encode(['error' => 'INVALID_CREDENTIALS', 'error_description' => 'Invalid request credentials']);
    exit;
}
switch ($method) {
    case 'crm.duplicate.findbycomm':
        echo $mode === 'found' ? '{"result":{"CONTACT":[77]}}' : '{"result":[]}';
        break;
    case 'crm.contact.add':
        echo '{"result":101}';
        break;
    case 'crm.deal.add':
        echo '{"result":555}';
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'ERROR_METHOD_NOT_FOUND']);
}
