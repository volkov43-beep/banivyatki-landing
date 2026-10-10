# Квиз подбора бани — реализация v1

Ветка `feature/sauna-quiz`, база main `ddcb0191c934f04b21a150cd6f54a4fecf7b81bc`.
Новая feature-ветка; merge и production deploy не выполнялись. Netlify не использовался.

## Порядок страницы

Header → Hero → Catalog → Works → Reviews → **Quiz (пятый блок)** → **SectionLocations / MapBlock (шестой)** → Calculator → Benefits → Comparison → Inside → Process → Showroom → FAQ → Final → Footer.

«Где стоят наши бани» найден в `works/MapBlock.jsx`, ранее внутри SectionWorks. Перенесена только его внешняя обёртка в SectionLocations: тот же фон ink, контейнер и отступы. Код MapBlock, координаты, загрузчик Яндекс Карт, fallback, цели и ключ не менялись. Карточки Works сохранены. Catalog и его modal/form не изменены.

## UI и файлы

- `src/data/quiz.js`: пять вопросов, field/id/type/required, labels/codes, версия, CSV toggle, проверка восстановления sessionStorage.
- `quiz/QuizSection.jsx`: светлая секция surface; banner forest, декоративный responsive img, CSS overlay forest 78–82%, заголовок/подзаголовок и «Займёт около 1 минуты», общий Button «Начать подбор». Линия accent 64×2, текст max800, min-height360/400, container/gutter/Onest/tokens прежние.
- `quiz/QuizDialog.jsx`: native dialog через portal; светлая surface-панель max960, padding20/40; на mobile внешние поля12, на desktop24. Neutral ink backdrop85%, vertical scroll, overflow-x hidden. ×:48×48, glyph32. Escape/cancel и pointerdown+click непосредственно по dialog/backdrop вызывают единый onClose. Клик внутри не закрывает. Заголовок получает focus при открытии/смене вопроса, native modal обеспечивает inert/focus containment. Body overflow сохраняется/восстанавливается. Возврат focus на фактический opener, при его исчезновении после success — на CTA секции.
- `quiz/QuizStep.jsx`: radio single-select с selected state и auto-next250ms; multi-select checkbox с явным «Продолжить». Назад, сохранённые ответы, `skipped` со второго шага. Unsure исключает прочие features. Таймер отменяется при закрытии/назад/unmount. Progress20/40/60/80/100%. Ответы:1 колонка <600,2 от600. Никаких анимаций перемещения; общий reduced-motion действует на Button.
- `quiz/QuizFinalForm.jsx`: один финальный submitLead; телефон обязателен, имя max100 необязательно, четыре native radio2×2 без default, согласие. Helpers phone/getUtm/submitLead/track прежние. Sending ref + disabled предотвращают повтор в полёте; error сохраняет ввод, retry только вручную. Form остаётся смонтированной при закрытии dialog, чтобы поздний ответ не терялся и не открывал вторую отправку при resume. Закрытие не отменяет HTTP. Контакты хранятся только в React memory, не в sessionStorage.
- `quiz/QuizFloatingReminder.jsx`: только после явного открытия квиза; desktop слева внизу компактная forest-карточка280px, mobile горизонтальный bar. Закрытие reminder сворачивает в «Подобрать баню». Mobile bottom88px + safe-area оставляет место прежней calculator fixed CTA (~64px); desktop bottom24. При dialog reminder скрыт и недоступен клавиатуре. После success удаляется.

Frontend elapsed отсчитывается от первого открытия текущего запуска, а не от перехода к форме. После полной перезагрузки новый отсчёт начинается при resume. Существующий antispam pattern сохранён: honeypot/слишком быстрое заполнение дают локальный success без HTTP/goal; сервер тоже может ответить ok при antispam drop.

## Session storage

Ключ `bv_quiz_v1`. Сохраняются version, step0..5, whitelist answers, widget hidden/expanded/compact, started и completed. Повреждённый JSON/чужая version дают чистое состояние; невозможный шаг ограничивается первым неотвеченным обязательным для перехода вопросом. Контактные данные/согласие/UTM в этом ключе отсутствуют. UTM использует прежний `bv_utm`.

Reload не открывает modal автоматически. Незавершённый quiz восстанавливает reminder и текущий шаг. Success очищает answers и прячет reminder до конца session. После success посетитель может осознанно снова нажать «Начать подбор»: новая попытка начинается с шага1 и пустой формы. `quiz_start` остаётся однократным для session. Если storage недоступен, состояние живёт в памяти до reload.

## Background

Оригинал `source-assets/quiz/quiz-bg-plan.jpg`2048×1143 только локальный; `.gitignore`: `/source-assets/quiz/*.jpg`. Никаких master JPG в Git/public/dist.

| Production file | Размер | Bytes |
| --- | --- | ---: |
| public/photos/quiz-bg-plan-640.webp |640×357 |43 760 |
| public/photos/quiz-bg-plan-1280.webp |1280×714 |132 774 |

Pillow LANCZOS, WebP92/method6, без upscale/crop/арт-редактирования и EXIF. Overlay не запечён. Decorative img: alt="", aria-hidden, lazy/async, width/height, object-cover; абсолютное размещение и размеры banner предотвращают image-driven layout shift. Реальный CLS не измерен. Sizes:1104px от1200, viewport−96 от768, иначе viewport−48.

## Пять вопросов / enum contract

Все ответы передаются raw strings; их человеческие подписи повторно задаются сервером.

| id / поле | Вопрос | Тип | Codes |
| --- | --- | --- | --- |
| place / quiz_place | Есть ли уже место для установки бани? | single, обязательный | ready; have_plot_choose_place; preparing_plot; no_plot |
| area / quiz_area | Какую площадь бани рассматриваете? | single | compact_35; medium_45; spacious_60; unsure; skipped |
| features / quiz_features | Что важно предусмотреть в бане? | multi CSV | year_round; side_entry; outside_firebox; canopy; terrace; shower; unsure; skipped |
| timing / quiz_timing | Когда планируете установить баню? | single | asap; month; one_three_months; three_six_months; later; skipped |
| budget / quiz_budget | На какой бюджет ориентируетесь? | single | under_350; 350_500; 500_700; over_700; unsure; skipped |

`quiz_version` только `v1`. `contact_method` только max/telegram/whatsapp/call, **только для quiz**. Catalog остаётся call/max. Пропуск — именно skipped, не отсутствие поля. Все пять полей обязательны в POST, даже если ответ skipped. CSV ≤200bytes; каждый token проверяется, duplicates удаляются, порядок фиксирован списком server options. Unsure/skipped не смешиваются с другими вариантами; пустые tokens, пробелы, unknown отклоняются. Числа/bool/arrays/objects вместо scalar strings отклоняются. Имя необязательно, string≤100; phone raw string≤40 и прежняя нормализация +7. Общие metadata сохраняют прежние ограничения bv_str.

## Фактический HTTP payload

Синтетический пример (общий helper добавляет referrer):

```json
{
  "form": "quiz",
  "quiz_version": "v1",
  "quiz_place": "ready",
  "quiz_area": "medium_45",
  "quiz_features": "year_round,outside_firebox",
  "quiz_timing": "one_three_months",
  "quiz_budget": "350_500",
  "phone": "+70000000000",
  "name": "Тест",
  "contact_method": "max",
  "utm_source": "yandex",
  "utm_medium": "cpc",
  "utm_campaign": "demo",
  "utm_content": "",
  "utm_term": "",
  "page_url": "https://banivyatki.ru/",
  "submitted_at": "2026-10-08T10:00:00.000Z",
  "elapsed_ms": 45000,
  "website": "",
  "referrer": ""
}
```

## PHP / CRM / queue

`public/api/lead.php` вызывает `bv_quiz_valid` после прежних antispam/rate limit и до phone normalization/REST. `server/lib.php`: BV_FORMS quiz, BV_QUIZ_FIELDS, BV_QUIZ_CONTACT_METHODS, bv_quiz_features, bv_quiz_valid; bv_build_lead сохраняет version и пять scalar quiz fields. Непредусмотренные keys (включая nested quiz_answers и клиентские CRM labels) не копируются. Старые business fields для quiz обнуляются: клиент не подменяет контекст формы свободным comment/price.

TITLE `Сайт · Квиз`; SOURCE_DESCRIPTION `Квиз · Подбор бани`. SOURCE_ID — прежнее yandex+cpc→Direct, иначе сайт, IDs из приватного config. CONTACT и UTM/воронка/стадия/ответственный прежние. Бюджет не OPPORTUNITY. Пример COMMENTS:

```text
Форма: Квиз · Подбор бани
Место: Участок и место определены
Площадь: Средняя — около 11 м² / 4,5 м
Особенности: Утепление для круглого года, Топка с улицы
Сроки: 1–3 месяца
Бюджет: 350–500 тыс. ₽
Способ связи: MAX
Запрос: Подобрать подходящую баню и отправить варианты
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 13:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

Skipped→«Не ответил», enum codes не выводятся в CRM. Referrer и строка повторного контакта добавляются общим кодом, если применимо.

Способ связи всегда записан текстом в COMMENTS. Существующий config mapping UF использует `contact_method_<code>`; без дополнительных configured telegram/whatsapp values UF не заполняется. **Для работы quiz менять private/config.php не требуется.** Не подставлять придуманные enum ID; если в будущем нужно сегментировать по UF, это отдельная настройка.

REST failure→private queue с нормализованными version/всеми ответами→retry с тем же COMMENTS. Retry.php/архитектура очереди не изменены. Новая lib понимает и старые jobs. После релиза не откатывать lib на версию без quiz, пока queue содержит quiz. Для будущей v2 сохранять понимание v1 jobs, не менять смысл старых codes задним числом.

## Analytics

| Goal | Условие | Params |
| --- | --- | --- |
| quiz_open | Явное открытие dialog | source:section/floating/compact |
| quiz_start | Первый фактический выбор в session | нет |
| quiz_step | Завершение/пропуск шага, включая повтор после Назад | step:1..5, question:place/area/features/timing/budget |
| quiz_close | Закрытие до success | step:1..5; contact screen обозначается5 |
| quiz_submit | Только submitLead ok:true | нет |

Нет phone/name/comments/свободных ответов в целях. Track/counter/index.html не изменены. Цели нужно отдельно создать/проверить в кабинете Метрики. Ok может означать queue acceptance, а не уже созданную сделку; автоматической отправки файлов/сообщений нет.

## Проверки и ограничения

- `npm run build`: успешная сборка Vite,103 modules.
- `php server/tests/phone.test.php`:22 проверки успешно.
- `php server/tests/handler.test.php`:213 проверок успешно (130 новых +83 прежних), PHP8.3. Quiz enums/CSV/dedup/exclusive sentinels, types/missing/lengths, контакты/точный COMMENTS/TITLE/source/UTM, queue/retry, privacy logs; regression catalog и старых форм.
- `scripts/tests/quiz.dom.mjs`:49 проверок в jsdom/React StrictMode, HTTP mocked, native dialog polyfilled. Шаги/auto-next/back/multi/skip/progress, validation/single pending submit/error/manual retry/success, close/backdrop/cancel/focus, reminder/compact/resume/session/no PII/completion/restart. Запуск: `BV_JSDOM_PATH=/absolute/path/to/jsdom/lib/api.js node scripts/tests/quiz.dom.mjs`. Можно установить jsdom в отдельный QA-каталог; production dependencies не добавлялись. Если jsdom доступен в module resolution, переменная не нужна.
- Прежний внешний catalog DOM harness:42 проверки успешно.
- `git diff --check`: успешно.
- **Реальный browser screenshot pack не создан:** локальный Chrome завершает даже `--version` с exit139 (SIGSEGV). Это не заменено DOM-скриншотами. Native focus trap/Escape, font wrapping, background crop, contrast, CLS и overflow на1440/1024/768/600/390/360 требуют browser QA перед release. CSS размеры/сетки реализованы, но прохождение визуальной проверки не заявляется.
- Production Bitrix24, Beget, Метрика, cron и реальные config/UF values не проверены.
- Существующий timeout15с и несколько REST calls по10с сохраняют риск дубля при неопределённом исходе/ручном retry. Серверной idempotency нет; автоматический frontend retry не добавлялся. Контакты не сохраняются после reload. Dev helper, как прежде, логирует payload в консоль; production build этого не делает. Queue содержит PII и остаётся строго private.

## Порядок выпуска

**ПЕРЕД MERGE вручную скопировать `server/lib.php` → `private/lib.php` на Beget. GitHub Actions private/lib.php НЕ доставляет.**

1. Провести review и ручной browser QA целевых ширин.
2. Сохранить приватную резервную копию текущей lib и очереди вне public_html.
3. Скопировать новую lib в private и проверить PHP syntax/совместимость старых форм. Private config/retry не заменять.
4. Только после подтверждения backend разрешать merge: существующий Actions доставит новый public/api/lead.php и frontend.
5. Проверить одну согласованную тестовую quiz-заявку, поля сделки/контакта, COMMENTS, цели и retry. Это не выполняется этой веткой.

Нельзя публиковать новый endpoint/frontend раньше private backend. Самостоятельный merge/deploy запрещён; итог работы — draft PR.
