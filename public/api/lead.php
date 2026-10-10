<?php
/**
 * Приём заявок с сайта banivyatki.ru → Битрикс24.
 *
 * Лежит в public_html/api/lead.php, в сборку попадает из public/api/ как есть.
 * Вся логика — в private/lib.php (на уровень выше public_html), секреты —
 * в private/config.php (в репозитории его нет, см. server/config.sample.php).
 * Пути считаются от расположения этого файла.
 *
 * Отвечает только JSON: {"ok":true} или {"ok":false,"error":"<код>"}.
 * Ответ Битрикса наружу не отдаётся. Если Битрикс недоступен — сайту всё
 * равно уходит успех, а заявка ложится в private/queue/ (retry.php дошлёт).
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

const BV_ALLOWED_ORIGINS = ['https://banivyatki.ru', 'https://www.banivyatki.ru'];
const BV_MIN_ELAPSED_MS = 3000;
const BV_RATE_LIMIT = 5;
const BV_RATE_WINDOW = 600;
const BV_MAX_BODY = 65536;
const BV_HONEYPOT_FIELD = 'website';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$GLOBALS['bv_responded'] = false;

function bv_respond(int $code, bool $ok, ?string $error = null): never
{
    $GLOBALS['bv_responded'] = true;
    http_response_code($code);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error ?? 'error']);
    exit;
}

// Любая неожиданная ошибка (в том числе синтаксическая в config.php) — короткий
// JSON без путей и текста ошибки; подробности уходят в error_log сервера.
register_shutdown_function(static function (): void {
    if ($GLOBALS['bv_responded']) {
        return;
    }
    $e = error_get_last();
    if ($e !== null && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        error_log('lead.php: fatal error type ' . $e['type']);
        if (!headers_sent()) {
            http_response_code(500);
        }
        echo json_encode(['ok' => false, 'error' => 'server_error']);
    }
});
set_exception_handler(static function (Throwable $t): void {
    error_log('lead.php: ' . get_class($t));
    bv_respond(500, false, 'server_error');
});

$lib = dirname(__DIR__, 2) . '/private/lib.php';
if (!is_file($lib)) {
    error_log('lead.php: private/lib.php not found');
    bv_respond(500, false, 'server_config');
}
require $lib;

// 1. Только POST
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    bv_respond(405, false, 'method_not_allowed');
}

// 2. Origin, если прислан, должен быть адресом сайта
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array(rtrim($origin, '/'), BV_ALLOWED_ORIGINS, true)) {
    bv_respond(403, false, 'forbidden');
}

// 3. Тело — JSON
$raw = file_get_contents('php://input');
if (!is_string($raw) || $raw === '' || strlen($raw) > BV_MAX_BODY) {
    bv_respond(400, false, 'bad_json');
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    bv_respond(400, false, 'bad_json');
}

$formForLog = is_string($data['form'] ?? null) ? preg_replace('/[^a-z_]/', '', $data['form']) : '-';

// 4. Ловушка заполнена — «успех», в Битрикс ничего
if (!empty($data[BV_HONEYPOT_FIELD])) {
    bv_log("form=$formForLog result=dropped reason=honeypot");
    bv_respond(200, true);
}

// 5. Форму заполнили быстрее 3 секунд — так же
$elapsed = $data['elapsed_ms'] ?? 0;
if (!is_numeric($elapsed) || (int) $elapsed < BV_MIN_ELAPSED_MS) {
    bv_log("form=$formForLog result=dropped reason=too_fast");
    bv_respond(200, true);
}

// 6. Не больше 5 заявок с одного IP за 10 минут
$ipHeader = '';
$cfgPeek = bv_load_config();
if (is_array($cfgPeek)) {
    $ipHeader = (string) ($cfgPeek['client_ip_header'] ?? '');
}
$ip = ($ipHeader !== '' && !empty($_SERVER[$ipHeader])) ? (string) $_SERVER[$ipHeader] : (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$ip = trim(explode(',', $ip)[0]);
if (bv_rate_limited($ip, BV_RATE_LIMIT, BV_RATE_WINDOW)) {
    bv_log("form=$formForLog result=rejected reason=rate_limit");
    bv_respond(429, false, 'too_many_requests');
}

// 7. Обязательные поля
$form = bv_form_name($data['form'] ?? null);
if ($form === null || empty($data['phone'])) {
    bv_respond(400, false, 'bad_request');
}
if (!bv_catalog_valid($data, $form) || !bv_quiz_valid($data, $form)) {
    bv_respond(400, false, 'bad_request');
}
$phone = bv_normalize_phone($data['phone']);
if ($phone === null) {
    bv_log("form=$form result=rejected reason=bad_phone");
    bv_respond(400, false, 'bad_phone');
}

// Конфиг: без него отвечаем ошибкой (путей и причин наружу не отдаём)
$cfg = $cfgPeek;
if (!is_array($cfg)) {
    bv_log("form=$form result=error reason=$cfg");
    error_log('lead.php: ' . $cfg);
    bv_respond(500, false, 'server_config');
}

$lead = bv_build_lead($data, $phone, $form);
$hash = bv_phone_hash($phone);

$res = bv_send_lead($cfg, $lead);
if ($res['ok']) {
    $found = $res['contact_found'] ? 'found' : 'new';
    bv_log("form=$form result=sent deal={$res['deal_id']} contact={$res['contact_id']}:$found attempts=1 phone=$hash");
    bv_respond(200, true);
}

// Битрикс недоступен или вернул ошибку — в очередь, сайту успех
$queued = bv_queue_put($res['lead'], $res['error']);
if ($queued === null) {
    bv_log("form=$form result=lost error={$res['error']} reason=queue_not_writable phone=$hash");
    error_log('lead.php: queue is not writable');
    bv_respond(500, false, 'server_error');
}
bv_log("form=$form result=queued error={$res['error']} attempts=1 queue=$queued phone=$hash");
bv_respond(200, true);
