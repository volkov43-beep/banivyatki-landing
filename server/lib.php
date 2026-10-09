<?php
/**
 * Общая библиотека обработчика заявок «Бани Вятки» → Битрикс24.
 *
 * На сервере лежит в private/lib.php (вне папки сайта). Её подключают
 * public_html/api/lead.php (приём заявок с сайта) и private/retry.php
 * (повторная отправка из очереди). Секретов здесь нет: адрес вебхука,
 * коды полей, стадий и источников — в private/config.php (в репозиторий
 * не попадает; образец — config.sample.php).
 *
 * Пути считаются от расположения этого файла: private/queue, private/log,
 * private/ratelimit, private/config.php.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Moscow');

/** Типы форм: подпись для SOURCE_DESCRIPTION и часть названия сделки. */
const BV_FORMS = [
    'calculator'   => ['label' => 'Калькулятор',              'title' => 'Расчёт'],
    'business'     => ['label' => 'Калькулятор, для бизнеса', 'title' => 'Для бизнеса'],
    'visit'        => ['label' => 'Запись на просмотр',       'title' => 'Запись'],
    'faq_question' => ['label' => 'Вопрос из FAQ',            'title' => 'Вопрос'],
    'final'        => ['label' => 'Форма внизу страницы',     'title' => 'Расчёт'],
    'catalog'      => ['label' => 'Каталог бань',             'title' => 'Каталог'],
    'quiz'         => ['label' => 'Квиз · Подбор бани',        'title' => 'Квиз'],
];
/** Старое или короткое имя формы → каноническое. */
const BV_FORM_ALIASES = ['calc' => 'calculator'];
const BV_VISIT_TYPES = ['showroom' => 'Шоурум', 'production' => 'Производство', 'video' => 'Видеозвонок'];
const BV_CONTACT_METHODS = ['call' => 'Звонок', 'max' => 'MAX'];
const BV_CATALOG_MODELS = [
    'podkova-35' => 'Подкова 3,5 м',
    'podkova-45' => 'Подкова 4,5 м',
    'podkova-60' => 'Подкова 6 м',
];
// Quiz v1: labels are trusted server-side, never accepted from the browser.
const BV_QUIZ_CONTACT_METHODS = ['max' => 'MAX', 'telegram' => 'Telegram', 'whatsapp' => 'WhatsApp', 'call' => 'Позвонить'];
const BV_QUIZ_FIELDS = [
    'quiz_place' => ['label' => 'Место', 'options' => [
        'ready' => 'Участок и место определены',
        'have_plot_choose_place' => 'Участок есть, место ещё выбираю',
        'preparing_plot' => 'Участок покупаю или готовлю',
        'no_plot' => 'Пока участка нет',
    ]],
    'quiz_area' => ['label' => 'Площадь', 'options' => [
        'compact_35' => 'Компактная — до 9 м² / 3,5 м',
        'medium_45' => 'Средняя — около 11 м² / 4,5 м',
        'spacious_60' => 'Просторная — около 14–15 м² / 6 м',
        'unsure' => 'Пока не определился', 'skipped' => 'Не ответил',
    ]],
    'quiz_features' => ['label' => 'Особенности', 'options' => [
        'year_round' => 'Утепление для круглого года', 'side_entry' => 'Вход сбоку',
        'outside_firebox' => 'Топка с улицы', 'canopy' => 'Козырёк',
        'terrace' => 'Терраса / крыльцо', 'shower' => 'Душ / моечная',
        'unsure' => 'Пока не знаю', 'skipped' => 'Не ответил',
    ]],
    'quiz_timing' => ['label' => 'Сроки', 'options' => [
        'asap' => 'Как можно скорее', 'month' => 'В течение месяца',
        'one_three_months' => '1–3 месяца', 'three_six_months' => '3–6 месяцев',
        'later' => 'Позже / пока изучаю', 'skipped' => 'Не ответил',
    ]],
    'quiz_budget' => ['label' => 'Бюджет', 'options' => [
        'under_350' => 'До 350 тыс. ₽', '350_500' => '350–500 тыс. ₽',
        '500_700' => '500–700 тыс. ₽', 'over_700' => 'Более 700 тыс. ₽',
        'unsure' => 'Пока не определился', 'skipped' => 'Не ответил',
    ]],
];
const BV_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const BV_MAX_ATTEMPTS = 10;
const BV_LOG_KEEP_DAYS = 30;
const BV_CURL_CONNECT_TIMEOUT = 5;
const BV_CURL_TIMEOUT = 10;

// ---------------------------------------------------------------------------
// Пути
// ---------------------------------------------------------------------------

function bv_private_dir(): string
{
    return __DIR__;
}

function bv_path(string $name): string
{
    return bv_private_dir() . '/' . $name;
}

function bv_ensure_dir(string $dir): bool
{
    if (is_dir($dir)) {
        return true;
    }
    return @mkdir($dir, 0750, true) || is_dir($dir);
}

// ---------------------------------------------------------------------------
// Конфиг
// ---------------------------------------------------------------------------

/**
 * Читает private/config.php. Возвращает массив настроек или код ошибки строкой
 * (config_missing / config_invalid / config_incomplete). Путь наружу не уходит.
 */
function bv_load_config(): array|string
{
    $file = bv_path('config.php');
    if (!is_file($file) || !is_readable($file)) {
        return 'config_missing';
    }
    $cfg = include $file;
    if (!is_array($cfg)) {
        return 'config_invalid';
    }
    foreach (['webhook_url', 'assigned_by_id', 'deal_category_id', 'deal_stage_id', 'source_site'] as $key) {
        if (!isset($cfg[$key]) || $cfg[$key] === '') {
            return 'config_incomplete';
        }
    }
    return $cfg;
}

// ---------------------------------------------------------------------------
// Журнал: private/log/ГГГГ-ММ-ДД.log. Телефон, имя и текст вопроса сюда не пишем.
// ---------------------------------------------------------------------------

function bv_log(string $line): void
{
    $dir = bv_path('log');
    if (!bv_ensure_dir($dir)) {
        error_log('bv lead: log dir is not writable');
        return;
    }
    @file_put_contents($dir . '/' . date('Y-m-d') . '.log', date('Y-m-d H:i:s') . ' ' . $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

/** Короткий хеш телефона для связи записей журнала с заявкой. */
function bv_phone_hash(string $phone): string
{
    return substr(hash('sha256', $phone), 0, 10);
}

/** Удаляет файлы журнала старше BV_LOG_KEEP_DAYS дней. Возвращает число удалённых. */
function bv_prune_logs(): int
{
    $removed = 0;
    $limit = time() - BV_LOG_KEEP_DAYS * 86400;
    foreach (glob(bv_path('log') . '/*.log') ?: [] as $file) {
        $base = basename($file, '.log');
        $ts = strtotime($base . ' 23:59:59');
        if ($ts !== false && $ts < $limit && @unlink($file)) {
            $removed++;
        }
    }
    return $removed;
}

// ---------------------------------------------------------------------------
// Телефон
// ---------------------------------------------------------------------------

/**
 * Приводит телефон к +7XXXXXXXXXX. Оставляет только цифры: 11 цифр с 7 или 8
 * в начале → +7 и десять последних, 10 цифр → +7 и они. Всё остальное → null.
 */
function bv_normalize_phone(mixed $raw): ?string
{
    if (!is_string($raw) && !is_int($raw)) {
        return null;
    }
    $digits = preg_replace('/\D+/', '', (string) $raw) ?? '';
    $len = strlen($digits);
    if ($len === 11 && ($digits[0] === '7' || $digits[0] === '8')) {
        return '+7' . substr($digits, 1);
    }
    if ($len === 10) {
        return '+7' . $digits;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Заявка: отбираем известные поля из того, что прислал сайт
// ---------------------------------------------------------------------------

function bv_str(array $data, string $key, int $max): string
{
    $value = $data[$key] ?? '';
    if (is_int($value) || is_float($value)) {
        $value = (string) $value;
    }
    if (!is_string($value)) {
        return '';
    }
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? '');
    return mb_substr($value, 0, $max);
}

/** Каноническое имя формы или null, если такой формы нет. */
function bv_form_name(mixed $raw): ?string
{
    if (!is_string($raw)) {
        return null;
    }
    $form = BV_FORM_ALIASES[$raw] ?? $raw;
    return isset(BV_FORMS[$form]) ? $form : null;
}

/** Validate raw catalog enums before bv_str can coerce or truncate them.
 * Legacy forms keep their existing validation contract.
 */
function bv_catalog_valid(array $data, string $form): bool
{
    if ($form !== 'catalog') {
        return true;
    }
    return is_string($data['phone'] ?? null)
        && is_string($data['contact_method'] ?? null)
        && isset(BV_CONTACT_METHODS[$data['contact_method']])
        && is_string($data['catalog_model'] ?? null)
        && isset(BV_CATALOG_MODELS[$data['catalog_model']]);
}

/** Strict bounded scalar CSV, stable order, no unknown tokens or mixed sentinels. */
function bv_quiz_features(mixed $raw): ?string
{
    if (!is_string($raw) || $raw === '' || strlen($raw) > 200) return null;
    $tokens = array_unique(explode(',', $raw));
    $allowed = BV_QUIZ_FIELDS['quiz_features']['options'];
    foreach ($tokens as $token) {
        if (!isset($allowed[$token])) return null;
    }
    if ((in_array('unsure', $tokens, true) || in_array('skipped', $tokens, true)) && count($tokens) !== 1) return null;
    return implode(',', array_values(array_intersect(array_keys($allowed), $tokens)));
}

/** Scenario-specific raw validation; legacy and catalog contracts stay intact. */
function bv_quiz_valid(array $data, string $form): bool
{
    if ($form !== 'quiz') return true;
    if (($data['quiz_version'] ?? null) !== 'v1'
        || !is_string($data['phone'] ?? null) || strlen($data['phone']) > 40
        || !is_string($data['contact_method'] ?? null)
        || !isset(BV_QUIZ_CONTACT_METHODS[$data['contact_method']])) return false;
    if (isset($data['name']) && (!is_string($data['name']) || mb_strlen($data['name']) > 100)) return false;
    foreach (BV_QUIZ_FIELDS as $key => $spec) {
        $value = $data[$key] ?? null;
        if ($key === 'quiz_features') {
            if (bv_quiz_features($value) === null) return false;
        } elseif (!is_string($value) || !isset($spec['options'][$value])) return false;
    }
    return true;
}

/**
 * Собирает заявку для отправки: только известные поля, обрезанные по длине.
 * $phone уже нормализован, $form — каноническое имя.
 */
function bv_build_lead(array $data, string $phone, string $form): array
{
    $price = $data['price_shown'] ?? null;
    $price = is_numeric($price) && (float) $price > 0 ? (int) $price : null;

    $lead = [
        'form'           => $form,
        'phone'          => $phone,
        'name'           => bv_str($data, 'name', 100),
        'contact_method' => bv_str($data, 'contact_method', 20),
        'option_shown'   => bv_str($data, 'option_shown', 200),
        'price_shown'    => $price,
        'visit_type'     => bv_str($data, 'visit_type', 20),
        'question'       => bv_str($data, 'question', 2000),
        'company'        => bv_str($data, 'company', 200),
        'comment'        => bv_str($data, 'comment', 2000),
        'page_url'       => bv_str($data, 'page_url', 500),
        'referrer'       => bv_str($data, 'referrer', 500),
        'submitted_at'   => bv_str($data, 'submitted_at', 40),
    ];
    foreach (BV_UTM_KEYS as $key) {
        $lead[$key] = bv_str($data, $key, 200);
    }
    if ($form === 'catalog') {
        $lead['catalog_model'] = bv_str($data, 'catalog_model', 20);
    }
    if ($form === 'quiz') {
        $lead['quiz_version'] = 'v1';
        foreach (BV_QUIZ_FIELDS as $key => $spec) {
            $lead[$key] = $key === 'quiz_features' ? bv_quiz_features($data[$key]) : bv_str($data, $key, 40);
        }
        // These are legacy scenario fields, not part of the quiz contract.
        foreach (['option_shown', 'visit_type', 'question', 'company', 'comment'] as $key) $lead[$key] = '';
        $lead['price_shown'] = null;
    }
    return $lead;
}

// ---------------------------------------------------------------------------
// Тексты для Битрикса
// ---------------------------------------------------------------------------

function bv_format_price(int $price): string
{
    return 'от ' . number_format($price, 0, '', ' ') . ' ₽';
}

/** Название сделки: «Сайт · Расчёт · 4–4,5 м, тёплый сезон · от 330 000 ₽». */
function bv_deal_title(array $lead): string
{
    $parts = ['Сайт'];
    $form = $lead['form'];
    switch ($form) {
        case 'calculator':
        case 'business':
            $parts[] = BV_FORMS[$form]['title'];
            if ($lead['option_shown'] !== '') {
                $parts[] = $lead['option_shown'];
            }
            if ($lead['price_shown']) {
                $parts[] = bv_format_price($lead['price_shown']);
            }
            break;
        case 'visit':
            $type = BV_VISIT_TYPES[$lead['visit_type']] ?? '';
            $parts[] = $type !== '' ? 'Запись: ' . mb_strtolower($type) : 'Запись';
            break;
        default:
            $parts[] = BV_FORMS[$form]['title'];
    }
    return implode(' · ', $parts);
}

/** Время отправки «05.10.2026 14:12 (МСК)» из ISO-строки сайта, иначе сейчас. */
function bv_submitted_text(string $iso): string
{
    $dt = null;
    if ($iso !== '') {
        try {
            $dt = new DateTimeImmutable($iso);
        } catch (Throwable) {
            $dt = null;
        }
    }
    $dt = ($dt ?? new DateTimeImmutable())->setTimezone(new DateTimeZone('Europe/Moscow'));
    return $dt->format('d.m.Y H:i') . ' (МСК)';
}

/** Комментарий к сделке: строки, пустые пропускаются. */
function bv_deal_comments(array $cfg, array $lead, bool $contactFound, ?int $contactId): string
{
    $lines = [];
    if ($contactFound && $contactId) {
        $portal = rtrim((string) ($cfg['portal_url'] ?? ''), '/');
        $lines[] = 'Повторное обращение' . ($portal !== '' ? ': ' . $portal . '/crm/contact/details/' . $contactId . '/' : '');
    }
    $lines[] = 'Форма: ' . BV_FORMS[$lead['form']]['label'];
    if ($lead['form'] === 'catalog') {
        $lines[] = 'Интересующая модель: ' . BV_CATALOG_MODELS[$lead['catalog_model']];
        $lines[] = 'Запрос: Отправить каталог бань';
    }
    if ($lead['form'] === 'quiz') {
        foreach (BV_QUIZ_FIELDS as $key => $spec) {
            $codes = $key === 'quiz_features' ? explode(',', $lead[$key]) : [$lead[$key]];
            $labels = array_map(static fn ($code) => $spec['options'][$code], $codes);
            $lines[] = $spec['label'] . ': ' . implode(', ', $labels);
        }
    }
    if ($lead['option_shown'] !== '') {
        $lines[] = 'Выбранный вариант: ' . $lead['option_shown'];
    }
    if ($lead['price_shown']) {
        $lines[] = 'Показанная цена: ' . bv_format_price($lead['price_shown']);
    }
    $methods = $lead['form'] === 'quiz' ? BV_QUIZ_CONTACT_METHODS : BV_CONTACT_METHODS;
    $method = $methods[$lead['contact_method']] ?? '';
    if ($method !== '') {
        $lines[] = 'Способ связи: ' . $method;
    }
    if ($lead['form'] === 'quiz') $lines[] = 'Запрос: Подобрать подходящую баню и отправить варианты';
    $visit = BV_VISIT_TYPES[$lead['visit_type']] ?? '';
    if ($visit !== '') {
        $lines[] = 'Тип визита: ' . $visit;
    }
    if ($lead['question'] !== '') {
        $lines[] = 'Вопрос: ' . $lead['question'];
    }
    if ($lead['company'] !== '') {
        $lines[] = 'Компания: ' . $lead['company'];
    }
    if ($lead['comment'] !== '') {
        $lines[] = 'Комментарий: ' . $lead['comment'];
    }
    if ($lead['page_url'] !== '') {
        $lines[] = 'Страница: ' . $lead['page_url'];
    }
    if ($lead['referrer'] !== '') {
        $lines[] = 'Переход с: ' . $lead['referrer'];
    }
    $lines[] = 'Время отправки: ' . bv_submitted_text($lead['submitted_at']);
    $utm = [];
    foreach (BV_UTM_KEYS as $key) {
        if ($lead[$key] !== '') {
            $utm[] = $key . '=' . $lead[$key];
        }
    }
    if ($utm) {
        $lines[] = 'Метки: ' . implode(', ', $utm);
    }
    return implode("\n", $lines);
}

/** Поля UTM по карте из конфига (ключ заявки → код поля в Битриксе). */
function bv_utm_fields(array $map, array $lead): array
{
    $fields = [];
    foreach (BV_UTM_KEYS as $key) {
        $code = $map[$key] ?? '';
        if (is_string($code) && $code !== '' && $lead[$key] !== '') {
            $fields[$code] = $lead[$key];
        }
    }
    return $fields;
}

function bv_contact_fields(array $cfg, array $lead): array
{
    $fields = [
        'NAME'           => $lead['name'] !== '' ? $lead['name'] : 'Клиент с сайта',
        'PHONE'          => [['VALUE' => $lead['phone'], 'VALUE_TYPE' => 'WORK']],
        'ASSIGNED_BY_ID' => $cfg['assigned_by_id'],
        'OPENED'         => 'Y',
    ];
    return $fields + bv_utm_fields((array) ($cfg['contact_utm_fields'] ?? []), $lead);
}

function bv_deal_fields(array $cfg, array $lead, int $contactId, bool $contactFound): array
{
    $isDirect = strcasecmp($lead['utm_source'], 'yandex') === 0 && strcasecmp($lead['utm_medium'], 'cpc') === 0;
    $source = $isDirect && !empty($cfg['source_direct']) ? $cfg['source_direct'] : $cfg['source_site'];

    $fields = [
        'TITLE'              => bv_deal_title($lead),
        'CATEGORY_ID'        => $cfg['deal_category_id'],
        'STAGE_ID'           => $cfg['deal_stage_id'],
        'ASSIGNED_BY_ID'     => $cfg['assigned_by_id'],
        'CONTACT_ID'         => $contactId,
        'SOURCE_ID'          => $source,
        'SOURCE_DESCRIPTION' => BV_FORMS[$lead['form']]['label'],
        'COMMENTS'           => bv_deal_comments($cfg, $lead, $contactFound, $contactId),
    ];

    $methodField = (string) ($cfg['contact_method_field'] ?? '');
    if ($methodField !== '') {
        $value = $cfg['contact_method_' . $lead['contact_method']] ?? '';
        if ($value !== '') {
            $fields[$methodField] = $value;
        }
    }

    return $fields + bv_utm_fields((array) ($cfg['deal_utm_fields'] ?? []), $lead);
}

// ---------------------------------------------------------------------------
// Битрикс24: REST через входящий вебхук, cURL
// ---------------------------------------------------------------------------

/**
 * Один вызов метода REST. Возвращает ['ok' => true, 'result' => …] или
 * ['ok' => false, 'error' => код]. В код ошибки не попадают ни адрес портала,
 * ни текст ответа — только короткий идентификатор.
 */
function bv_bitrix_call(array $cfg, string $method, array $params): array
{
    $url = rtrim((string) $cfg['webhook_url'], '/') . '/' . $method . '.json';
    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'error' => 'curl_init'];
    }
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($params, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => BV_CURL_CONNECT_TIMEOUT,
        CURLOPT_TIMEOUT        => BV_CURL_TIMEOUT,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($errno !== 0) {
        return ['ok' => false, 'error' => 'curl_' . $errno];
    }
    $json = json_decode((string) $body, true);
    if (!is_array($json)) {
        return ['ok' => false, 'error' => 'http_' . $http . '_bad_json'];
    }
    if (isset($json['error'])) {
        $code = is_string($json['error']) ? preg_replace('/[^A-Za-z0-9_]/', '', $json['error']) : 'unknown';
        return ['ok' => false, 'error' => 'bitrix_' . substr((string) $code, 0, 40)];
    }
    if ($http < 200 || $http >= 300) {
        return ['ok' => false, 'error' => 'http_' . $http];
    }
    return ['ok' => true, 'result' => $json['result'] ?? null];
}

/**
 * Отправляет заявку в Битрикс: ищет контакт по телефону, создаёт при
 * отсутствии, создаёт сделку. Найденный или созданный контакт запоминается
 * в $lead['contact_id'], чтобы при повторной попытке не создать второй.
 *
 * Возвращает ['ok' => bool, 'error' => код, 'deal_id', 'contact_id',
 * 'contact_found', 'lead' => заявка с contact_id].
 */
function bv_send_lead(array $cfg, array $lead): array
{
    $contactId = isset($lead['contact_id']) ? (int) $lead['contact_id'] : 0;
    $found = (bool) ($lead['contact_found'] ?? false);

    if ($contactId <= 0) {
        $r = bv_bitrix_call($cfg, 'crm.duplicate.findbycomm', [
            'type'        => 'PHONE',
            'values'      => [$lead['phone']],
            'entity_type' => 'CONTACT',
        ]);
        if (!$r['ok']) {
            return ['ok' => false, 'error' => 'find:' . $r['error'], 'lead' => $lead];
        }
        $ids = is_array($r['result']) ? ($r['result']['CONTACT'] ?? []) : [];
        if (is_array($ids) && $ids) {
            $contactId = (int) reset($ids);
            $found = true;
        } else {
            $r = bv_bitrix_call($cfg, 'crm.contact.add', ['fields' => bv_contact_fields($cfg, $lead)]);
            if (!$r['ok']) {
                return ['ok' => false, 'error' => 'contact:' . $r['error'], 'lead' => $lead];
            }
            $contactId = (int) $r['result'];
            $found = false;
        }
        if ($contactId <= 0) {
            return ['ok' => false, 'error' => 'contact:bad_id', 'lead' => $lead];
        }
        $lead['contact_id'] = $contactId;
        $lead['contact_found'] = $found;
    }

    $r = bv_bitrix_call($cfg, 'crm.deal.add', ['fields' => bv_deal_fields($cfg, $lead, $contactId, $found)]);
    if (!$r['ok']) {
        return ['ok' => false, 'error' => 'deal:' . $r['error'], 'lead' => $lead];
    }
    return [
        'ok'            => true,
        'deal_id'       => (int) $r['result'],
        'contact_id'    => $contactId,
        'contact_found' => $found,
        'lead'          => $lead,
    ];
}

// ---------------------------------------------------------------------------
// Очередь: private/queue/*.json, неотправленные — private/queue/failed/
// ---------------------------------------------------------------------------

/** Кладёт заявку в очередь. Возвращает имя файла или null, если записать не удалось. */
function bv_queue_put(array $lead, string $error): ?string
{
    $dir = bv_path('queue');
    if (!bv_ensure_dir($dir)) {
        return null;
    }
    $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.json';
    $job = [
        'created_at' => date('c'),
        'attempts'   => 1,
        'last_error' => $error,
        'lead'       => $lead,
    ];
    $json = json_encode($job, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    return @file_put_contents($dir . '/' . $name, $json, LOCK_EX) !== false ? $name : null;
}

function bv_queue_write(string $file, array $job): bool
{
    $json = json_encode($job, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    return @file_put_contents($file, $json, LOCK_EX) !== false;
}

// ---------------------------------------------------------------------------
// Ограничение частоты: не больше $limit заявок с одного IP за $window секунд
// ---------------------------------------------------------------------------

function bv_rate_limited(string $ip, int $limit = 5, int $window = 600): bool
{
    $dir = bv_path('ratelimit');
    if (!bv_ensure_dir($dir)) {
        return false; // не можем считать — не блокируем
    }
    $file = $dir . '/' . sha1($ip) . '.json';
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        return false;
    }
    $limited = false;
    if (flock($fh, LOCK_EX)) {
        $now = time();
        $raw = stream_get_contents($fh);
        $stamps = is_string($raw) && $raw !== '' ? (json_decode($raw, true) ?: []) : [];
        $stamps = array_values(array_filter($stamps, static fn ($t) => is_int($t) && $t > $now - $window));
        if (count($stamps) >= $limit) {
            $limited = true;
        } else {
            $stamps[] = $now;
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($stamps));
        fflush($fh);
        flock($fh, LOCK_UN);
    }
    fclose($fh);
    return $limited;
}

/** Удаляет счётчики, в которых не было заявок дольше $window секунд. */
function bv_prune_ratelimit(int $window = 600): int
{
    $removed = 0;
    foreach (glob(bv_path('ratelimit') . '/*.json') ?: [] as $file) {
        if (filemtime($file) < time() - $window && @unlink($file)) {
            $removed++;
        }
    }
    return $removed;
}
