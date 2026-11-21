<?php
/**
 * Isolated CLI adapter. Neither the website nor retry.php loads this file.
 * Its caller owns a private local spool, separate from the active deal queue.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/lib.php';

function bv_v3_endpoint(array $cfg): string
{
    $url = $cfg['webhook_url'] ?? null;
    // Only the canonical incoming webhook base. Never persist or log this URL.
    if (!is_string($url) || !preg_match('~\Ahttps://([a-zA-Z0-9.-]+(?::[0-9]{1,5})?)/rest/([1-9][0-9]*)/([a-zA-Z0-9_-]+)/?\z~', $url, $m)) {
        throw new InvalidArgumentException('lead_v3_webhook');
    }
    return 'https://' . strtolower($m[1]) . '/rest/api/' . $m[2] . '/' . $m[3] . '/crm.lead.add';
}

/** Only accepts a validated, normalized site submission. */
function bv_v3_fields(array $cfg, array $lead): array
{
    $settings = $cfg['lead_v3'] ?? [];
    $isDirect = strcasecmp($lead['utm_source'], 'yandex') === 0 && strcasecmp($lead['utm_medium'], 'cpc') === 0;
    $source = $settings[$isDirect ? 'source_direct' : 'source_site'] ?? null;
    $phoneType = $settings['phone_type'] ?? null;
    if (!is_string($source) || trim($source) === '' || !is_string($phoneType) || trim($phoneType) === '') {
        throw new InvalidArgumentException('lead_v3_dictionary');
    }
    $name = $lead['name'];
    $comments = bv_deal_comments([], $lead, false, null);
    if (mb_strlen($name) > 50) {
        $comments .= "\nИмя из формы: " . $name;
    }
    $fields = [
        'title' => mb_substr(bv_deal_title($lead), 0, 255),
        'phone' => [['valueTypeId' => $phoneType, 'value' => $lead['phone']]],
        'sourceId' => $source,
        'sourceDescription' => BV_FORMS[$lead['form']]['label'],
        'comments' => $comments,
    ];
    if ($name !== '') {
        $fields['name'] = mb_substr($name, 0, 50);
    }
    foreach (BV_UTM_KEYS as $key) {
        if ($lead[$key] !== '') {
            $fields['utm'][substr($key, 4)] = $lead[$key];
        }
    }
    if (isset($settings['assigned_by_id'])) {
        if (!is_int($settings['assigned_by_id']) || $settings['assigned_by_id'] <= 0) {
            throw new InvalidArgumentException('lead_v3_assignee');
        }
        $fields['assignedById'] = $settings['assigned_by_id'];
    }
    if (isset($settings['stage_id'])) {
        if (!is_string($settings['stage_id']) || trim($settings['stage_id']) === '') {
            throw new InvalidArgumentException('lead_v3_stage');
        }
        $fields['stageId'] = $settings['stage_id'];
    }
    $mappings = $settings['custom'] ?? [];
    if (!is_array($mappings)) {
        throw new InvalidArgumentException('lead_v3_custom');
    }
    foreach ($mappings as $input => $map) {
        $field = $map['field'] ?? null;
        if (!in_array($input, ['contact_method', 'catalog_model', 'landing_region'], true)
            || !is_string($field) || !preg_match('/\AUF_CRM_[A-Z0-9_]+\z/', $field)
            || !is_array($map['values'] ?? null) || array_key_exists($field, $fields)) {
            throw new InvalidArgumentException('lead_v3_custom');
        }
        $code = $lead[$input] ?? '';
        if ($code !== '') {
            $value = $map['values'][$code] ?? null;
            if (!is_int($value) && (!is_string($value) || trim($value) === '')) {
                throw new InvalidArgumentException('lead_v3_custom_value');
            }
            $fields[$field] = $value;
        }
    }
    return $fields;
}

/** Atomic publication of a complete private record. New keys must never replace an operation. */
function bv_v3_store(string $path, array $job, bool $create = false): void
{
    $json = json_encode($job, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $dir = dirname($path);
    $tmp = @tempnam($dir, '.v3-');
    if ($tmp === false) {
        throw new RuntimeException('lead_v3_storage');
    }
    try {
        if (dirname($tmp) !== realpath($dir)) {
            throw new RuntimeException('lead_v3_storage');
        }
        $stream = @fopen($tmp, 'wb');
        if (!$stream) {
            throw new RuntimeException('lead_v3_storage');
        }
        try {
            if (fwrite($stream, $json) !== strlen($json) || !fflush($stream) || !fsync($stream)) {
                throw new RuntimeException('lead_v3_storage');
            }
        } finally {
            fclose($stream);
        }
        $ok = $create ? @link($tmp, $path) : @rename($tmp, $path);
        if (!$ok) {
            throw new RuntimeException('lead_v3_storage');
        }
        // Persist the directory entry before any HTTP call can follow this transition.
        $directory = @fopen($dir, 'r');
        if (!$directory) {
            throw new RuntimeException('lead_v3_storage');
        }
        try {
            if (!fsync($directory)) {
                throw new RuntimeException('lead_v3_storage');
            }
        } finally {
            fclose($directory);
        }
    } finally {
        if (file_exists($tmp)) {
            unlink($tmp);
        }
    }
}

function bv_v3_seal(string $url, string $key, int $created, string $body): string
{
    return hash_hmac('sha256', "lead-v3\n$key\n$created\n" . $body, $url);
}

/** A new business submission gets a fresh key. Retrying must use the returned handle. */
function bv_v3_prepare(string $dir, array $cfg, array $lead): string
{
    if ((array_key_exists('crm_target', $lead) && $lead['crm_target'] !== 'lead') || isset($lead['contact_id'])) {
        throw new InvalidArgumentException('lead_v3_route');
    }
    $url = bv_v3_endpoint($cfg);
    $body = json_encode(['fields' => bv_v3_fields($cfg, $lead)], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $key = bin2hex(random_bytes(16));
    $created = time();
    $lead['crm_target'] = 'lead';
    $lead['v3_operation'] = ['key' => $key, 'body' => $body, 'created' => $created,
        'seal' => bv_v3_seal($url, $key, $created, $body)];
    bv_v3_store("$dir/$key.json", ['created_at' => date('c', $created), 'attempts' => 0, 'lead' => $lead,
        'delivery' => ['state' => 'ready', 'reason' => 'prepared']], true);
    return $key;
}

/** Fixed diagnostic vocabulary. Raw CRM messages, validation values and transport errors stay out of logs. */
function bv_v3_post(string $url, string $key, string $body): array
{
    $echo = null;
    $replayed = false;
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json', "Idempotency-Key: $key"],
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_CONNECTTIMEOUT => BV_CURL_CONNECT_TIMEOUT, CURLOPT_TIMEOUT => BV_CURL_TIMEOUT,
        CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$echo, &$replayed): int {
            if (str_starts_with($line, 'HTTP/')) {
                $echo = null;
                $replayed = false;
            } elseif (stripos($line, 'Idempotency-Key:') === 0) {
                $echo = trim(substr($line, strlen('Idempotency-Key:')));
            } elseif (stripos($line, 'Idempotent-Replayed:') === 0) {
                $replayed = strcasecmp(trim(substr($line, strlen('Idempotent-Replayed:'))), 'true') === 0;
            }
            return strlen($line);
        },
    ]);
    $raw = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    if ($raw === false) {
        return ['state' => 'review', 'reason' => curl_errno($curl) === CURLE_OPERATION_TIMEDOUT ? 'timeout' : 'transport'];
    }
    $data = json_decode($raw, true);
    $code = $data['error']['code'] ?? null;
    if ($status === 200 && is_array($data) && !array_key_exists('error', $data)
        && is_int($data['result']['id'] ?? null) && $data['result']['id'] > 0 && $echo === $key) {
        return ['state' => 'sent', 'reason' => 'confirmed', 'id' => $data['result']['id'], 'replayed' => $replayed];
    }
    if ($status === 429 && is_string($code) && $echo === $key) {
        return ['state' => 'retry', 'reason' => 'rate_limit'];
    }
    $reason = match (true) {
        $code === 'BITRIX_REST_V3_EXCEPTION_IDEMPOTENCYKEYREUSEDEXCEPTION' => 'key_reused',
        $code === 'BITRIX_REST_V3_EXCEPTION_INVALIDIDEMPOTENCYKEYEXCEPTION' => 'invalid_key',
        $status === 401 => 'authentication',
        $code === 'BITRIX_REST_V3_EXCEPTION_INSUFFICIENTSCOPEEXCEPTION' => 'scope',
        $status === 403 => 'permission',
        is_string($code) && str_starts_with($code, 'BITRIX_REST_V3_EXCEPTION_VALIDATION_') => 'validation',
        $status === 404 => 'method_unavailable',
        default => 'unconfirmed_response',
    };
    return ['state' => 'review', 'reason' => $reason];
}

/**
 * Process one saved operation. A confirmed replay is a separate operator decision:
 * verify the previous request has finished and the portal supports idempotency first.
 * No public handler or actual cron invokes this function.
 */
function bv_v3_attempt(string $dir, array $cfg, string $key, bool $confirmedReplay = false): array
{
    if (!preg_match('/\A[a-f0-9]{32}\z/', $key)) {
        throw new InvalidArgumentException('lead_v3_key');
    }
    // One persistent inode per spool, also while JSON files are atomically replaced.
    $lock = @fopen("$dir/.lead-v3.lock", 'c');
    if (!$lock) {
        throw new RuntimeException('lead_v3_lock');
    }
    try {
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            return ['state' => 'busy', 'reason' => 'locked'];
        }
        $path = "$dir/$key.json";
        $job = json_decode((string) @file_get_contents($path), true);
        $lead = $job['lead'] ?? [];
        $op = $lead['v3_operation'] ?? [];
        if (($lead['crm_target'] ?? null) !== 'lead' || ($op['key'] ?? null) !== $key
            || !is_int($op['created'] ?? null) || !is_string($op['body'] ?? null) || !is_string($op['seal'] ?? null)
            || !is_int($job['attempts'] ?? null) || !is_string($job['delivery']['state'] ?? null)) {
            error_log('lead_v3 review invalid_record');
            return ['state' => 'review', 'reason' => 'invalid_record'];
        }
        $previous = $job['delivery'];
        if ($previous['state'] === 'sent' || ($previous['state'] === 'review' && !$confirmedReplay)) {
            return $previous;
        }
        $url = bv_v3_endpoint($cfg);
        $now = time();
        if (!hash_equals($op['seal'], bv_v3_seal($url, $key, $op['created'], $op['body']))) {
            $result = ['state' => 'review', 'reason' => 'scope_or_snapshot_changed'];
        } elseif ($now < $op['created'] || $now - $op['created'] >= 86400 - 300) {
            $result = ['state' => 'review', 'reason' => 'window'];
        } elseif ($previous['state'] === 'sending') {
            $result = ['state' => 'review', 'reason' => 'interrupted'];
        } elseif ($previous['state'] === 'review'
            && !in_array($previous['reason'] ?? null, ['timeout', 'transport', 'unconfirmed_response', 'interrupted'], true)) {
            return $previous;
        } elseif (!in_array($previous['state'], ['ready', 'retry', 'review'], true)) {
            $result = ['state' => 'review', 'reason' => 'invalid_state'];
        } else {
            $job['attempts']++;
            $job['delivery'] = ['state' => 'sending', 'reason' => 'in_flight'];
            bv_v3_store($path, $job);
            $result = bv_v3_post($url, $key, $op['body']);
        }
        $job['delivery'] = $result;
        bv_v3_store($path, $job);
        error_log('lead_v3 ' . $result['state'] . ' ' . $result['reason']);
        return $result;
    } finally {
        fclose($lock);
    }
}
