<?php
/** Regional cases for the local HTTP handler and CRM stub in handler.test.php. */
declare(strict_types=1);

$komiHeader = "Лендинг: Сыктывкар / Республика Коми\nУсловия: региональная стоимость\nУточнить населённый пункт, адрес доставки и условия установки.\n";
$komiUrl = 'https://banivyatki.ru/syktyvkar/';
$homeUrl = 'https://banivyatki.ru/';
$cases = [
    'calculator' => lead(),
    'calc' => lead(['form' => 'calc']),
    'business' => lead(['form' => 'business', 'company' => 'Тестовая база', 'comment' => 'Две бани']),
    'visit' => lead(['form' => 'visit', 'visit_type' => 'video']),
    'faq_question' => lead(['form' => 'faq_question', 'question' => 'Как согласовать основание?']),
    'final' => lead(['form' => 'final']),
    'catalog/all' => catalogLead('all'),
    'catalog/model' => catalogLead('podkova-45'),
    'quiz' => quizLead(),
];
foreach ($cases as $scenario => $payload) {
    if (!in_array($scenario, ['calculator', 'calc'], true)) {
        $payload['option_shown'] = '';
        $payload['price_shown'] = null;
    }
    foreach (['DIRECT' => 'yandex', 'WEB' => 'organic'] as $source => $utmSource) {
        $payload['utm_source'] = $utmSource;
        $payload['utm_content'] = 'test-content';
        $payload['utm_term'] = 'test-term';
        foreach ([$homeUrl, $komiUrl] as $url) {
            resetStub('ok');
            [$status] = post(['page_url' => $url] + $payload);
            $calls = stubCalls();
            $deal = lastDeal();
            $methods = array_map(static fn ($call) => explode(' ', $call, 2)[0], $calls);
            check("$scenario $source $url: accepted, single ordinary CRM sequence", $status === 200
                && $methods === ['crm.duplicate.findbycomm', 'crm.contact.add', 'crm.deal.add']
                && ($deal['SOURCE_ID'] ?? '') === $source);
            if ($url === $homeUrl) {
                $expectedDeal = $deal;
                $expectedContactCalls = array_slice($calls, 0, 2);
                check("$scenario $source: general title and first line", str_starts_with($deal['TITLE'], 'Сайт · ')
                    && str_starts_with($deal['COMMENTS'], 'Форма: '));
            } else {
                $expectedDeal['TITLE'] = 'Сыктывкар · ' . $expectedDeal['TITLE'];
                $expectedDeal['COMMENTS'] = $komiHeader . str_replace("Страница: $homeUrl\n", "Страница: $komiUrl\n", $expectedDeal['COMMENTS']);
                check("$scenario $source: exact header and all original CRM fields", $deal === $expectedDeal
                    && array_slice($calls, 0, 2) === $expectedContactCalls);
            }
        }
    }
}

$urls = [
    [$komiUrl, true], ['https://BANIVYATKI.ru/syktyvkar', true],
    ['HTTPS://WWW.Banivyatki.ru:443/syktyvkar/index.html?a=b#calculator', true],
    [$komiUrl . '?utm_campaign=' . str_repeat('a', 1000) . '#visit-form', true],
    [$homeUrl, false], [$homeUrl . '?utm_campaign=syktyvkar', false],
    [$homeUrl . '#/syktyvkar/', false], [$homeUrl . 'syktyvkar-other/', false],
    [$komiUrl . 'example/', false], [$homeUrl . 'Syktyvkar/', false], [$homeUrl . 'syktyvkar%2F', false],
    ['https://example.com/syktyvkar/', false], ['https://banivyatki.ru.example.com/syktyvkar/', false],
    ['https://user:pass@banivyatki.ru/syktyvkar/', false], ['https://@banivyatki.ru/syktyvkar/', false],
    ['http://banivyatki.ru/syktyvkar/', false], ['ftp://banivyatki.ru/syktyvkar/', false],
    ['/syktyvkar/', false], ['https://banivyatki.ru:8443/syktyvkar/', false],
    ['https://banivyatki.ru:443x/syktyvkar/', false], ['https://banivyatki.ru:/syktyvkar/', false],
    ['', false], [null, false], [[], false],
    // Truncation would hide the invalid character. Store the decision made on the full input.
    [$komiUrl . '?x=' . str_repeat('a', 600) . "\n", false],
];
foreach ($urls as $i => [$url, $regional]) {
    resetStub('ok');
    [$status] = post(catalogLead('all', [
        'page_url' => $url, 'region' => 'syktyvkar', 'landing_region' => 'syktyvkar',
        'TITLE' => 'client title', 'COMMENTS' => 'client comments', 'SOURCE_ID' => 'client source',
        'CATEGORY_ID' => 987, 'STAGE_ID' => 'client stage', 'ASSIGNED_BY_ID' => 987,
        'utm_term' => 'Сыктывкар', 'referrer' => $komiUrl, 'comment' => 'Сыктывкар',
    ]));
    $deal = lastDeal();
    check("page_url #$i: expected server classification, other fields ignored", $status === 200
        && $deal['TITLE'] === ($regional ? 'Сыктывкар · ' : '') . 'Сайт · Каталог · Все модели'
        && str_starts_with($deal['COMMENTS'], ($regional ? $komiHeader : '') . "Форма: Каталог бань\n")
        && $deal['SOURCE_ID'] === 'DIRECT' && $deal['CATEGORY_ID'] === 0 && $deal['STAGE_ID'] === 'NEW'
        && $deal['ASSIGNED_BY_ID'] === 1 && !str_contains($deal['COMMENTS'], 'client comments'));
}

foreach (['under_350' => 'До 350 тыс. ₽', '350_500' => '350–500 тыс. ₽', '500_700' => '500–700 тыс. ₽', 'over_700' => 'Более 700 тыс. ₽'] as $code => $label) {
    resetStub('ok');
    [$status] = post(quizLead(['quiz_budget' => $code]));
    check("Kirov budget $code unchanged", $status === 200 && lastDeal()['TITLE'] === 'Сайт · Квиз'
        && str_contains(lastDeal()['COMMENTS'], "Бюджет: $label\n"));
}

resetStub('found');
[$status] = post(catalogLead('all', ['page_url' => $komiUrl]));
$repeatText = "Повторное обращение: http://127.0.0.1:8091/crm/contact/details/77/\nФорма: Каталог бань\n";
check('returning Komi customer: existing contact and regional header before repeat line', $status === 200
    && count(stubCalls()) === 2 && lastDeal()['CONTACT_ID'] === 77
    && str_starts_with(lastDeal()['COMMENTS'], $komiHeader . $repeatText));

// Exercise the saved contact ID after a deal-only failure, for new and legacy queue files.
foreach ([
    ['deal_error', $komiUrl . '?x=' . str_repeat('a', 800), false, true],
    ['found_deal_error', $komiUrl, true, true],
    ['deal_error', $homeUrl, true, false],
    ['deal_error', null, true, false],
    ['deal_error', $komiUrl . '?x=' . str_repeat('a', 800) . "\n", false, false],
] as [$mode, $url, $legacy, $regional]) {
    resetStub($mode);
    [$status, $reply] = post(catalogLead('all', ['page_url' => $url]));
    $files = queueFiles();
    check('failed deal accepted for retry', $status === 200 && $reply === '{"ok":true}' && count($files) === 1);
    $job = json_decode(file_get_contents($files[0]), true, 512, JSON_THROW_ON_ERROR);
    $contactId = $mode === 'found_deal_error' ? 77 : 101;
    check('normalized queue data and checkpoint', $job['lead']['landing_region'] === ($regional ? 'syktyvkar' : '')
        && $job['lead']['contact_id'] === $contactId && $job['lead']['page_url'] === mb_substr(trim($url ?? ''), 0, 500));
    $expected = lastDeal();
    if ($legacy) {
        unset($job['lead']['landing_region']);
        if ($url === null) unset($job['lead']['page_url']);
        file_put_contents($files[0], json_encode($job, JSON_THROW_ON_ERROR));
    }
    resetStub('ok');
    exec('php ' . escapeshellarg("$priv/retry.php") . ' 2>&1', $output, $exitCode);
    check('retry: one deal call using stored contact, exact original fields, queue drained', $exitCode === 0
        && queueFiles() === [] && count(stubCalls()) === 1 && lastDeal() === $expected
        && $expected['TITLE'] === ($regional ? 'Сыктывкар · ' : '') . 'Сайт · Каталог · Все модели'
        && str_starts_with($expected['COMMENTS'], ($regional ? $komiHeader : '')
            . ($contactId === 77 ? $repeatText : 'Форма: Каталог бань')));
}
