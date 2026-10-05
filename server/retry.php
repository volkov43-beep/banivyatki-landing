<?php
/**
 * Повторная отправка заявок из очереди в Битрикс24.
 *
 * Лежит в private/retry.php (вне папки сайта), запускается планировщиком
 * раз в пять минут из командной строки (cron, минуты «каждые 5»):
 *   php /путь/до/сайта/private/retry.php
 *
 * По HTTP не работает (вторая линия защиты: папка private и так закрыта).
 * Берёт файлы из private/queue/, делает до BV_MAX_ATTEMPTS (10) попыток,
 * после чего переносит файл в private/queue/failed/ и пишет в журнал.
 * Два экземпляра одновременно не работают: блокировка по файлу retry.lock.
 * Заодно удаляет журналы старше 30 дней и устаревшие счётчики частоты.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/lib.php';

$lockFile = bv_path('retry.lock');
$lock = fopen($lockFile, 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, "retry.php: уже запущен, выходим\n");
    exit(0);
}

$cfg = bv_load_config();
if (!is_array($cfg)) {
    bv_log("retry result=error reason=$cfg");
    fwrite(STDERR, "retry.php: конфиг не прочитан ($cfg)\n");
    exit(1);
}

$prunedLogs = bv_prune_logs();
$prunedRate = bv_prune_ratelimit();

$queueDir = bv_path('queue');
$failedDir = $queueDir . '/failed';
$files = glob($queueDir . '/*.json') ?: [];
sort($files);

$sent = 0;
$left = 0;
$failed = 0;

foreach ($files as $file) {
    $job = json_decode((string) @file_get_contents($file), true);
    if (!is_array($job) || !is_array($job['lead'] ?? null)) {
        bv_ensure_dir($failedDir);
        @rename($file, $failedDir . '/' . basename($file));
        bv_log('retry result=failed reason=bad_job queue=' . basename($file));
        $failed++;
        continue;
    }

    $lead = $job['lead'];
    $attempts = (int) ($job['attempts'] ?? 0) + 1;
    $form = (string) ($lead['form'] ?? '-');
    $hash = isset($lead['phone']) ? bv_phone_hash((string) $lead['phone']) : '-';

    $res = bv_send_lead($cfg, $lead);
    if ($res['ok']) {
        @unlink($file);
        $found = $res['contact_found'] ? 'found' : 'new';
        bv_log("form=$form result=sent deal={$res['deal_id']} contact={$res['contact_id']}:$found attempts=$attempts queue=" . basename($file) . " phone=$hash");
        $sent++;
        continue;
    }

    $job['attempts'] = $attempts;
    $job['last_error'] = $res['error'];
    $job['last_attempt_at'] = date('c');
    $job['lead'] = $res['lead']; // с contact_id, если контакт уже создан

    if ($attempts >= BV_MAX_ATTEMPTS) {
        bv_ensure_dir($failedDir);
        $target = $failedDir . '/' . basename($file);
        bv_queue_write($file, $job);
        @rename($file, $target);
        bv_log("form=$form result=failed error={$res['error']} attempts=$attempts queue=" . basename($file) . " phone=$hash");
        $failed++;
    } else {
        bv_queue_write($file, $job);
        bv_log("form=$form result=retry_later error={$res['error']} attempts=$attempts queue=" . basename($file) . " phone=$hash");
        $left++;
    }
}

flock($lock, LOCK_UN);
fclose($lock);

echo "retry: отправлено $sent, в очереди $left, отказ $failed; удалено журналов $prunedLogs, счётчиков $prunedRate\n";
