# Каталог «Подкова»: реализация и порядок выпуска

Дата: 08.10.2026. Ветка: `feature/catalog-models`; основа bdca6c33b3d9051ec2ae78d32e8721f00ec56005. Реализация подготовлена для draft review; master JPG исключены из Git tracking и истории публикуемой ветки по прямому указанию владельца. Правило `.gitignore`: `/source-assets/catalog/*.jpg`. Main не изменён, production не опубликован, кабинеты Beget/Битрикс/Метрика не проверялись.

## Актуализация CTA — 20.10.2026

Ветка `feature/hero-catalog-card-quiz` от актуальной main `36f9261`. Hero → общий каталог; карточки → новый квиз. Ниже сохранена история подготовки assets; изображения в этой правке не менялись.

**До merge вручную обновить `server/lib.php` → `private/lib.php` на Beget и проверить совместимость. GitHub Actions этот приватный файл не доставляет. Только затем разрешать публикацию нового frontend.** Config/retry/вебхуки не менять; перенос на сервер этой работой не выполнялся. Новая библиотека совместима с прежними тремя моделями и остальными формами; старую lib нельзя возвращать, пока в очереди есть заявки `catalog_model: all`.

## 1. Файлы

Изменены:

- `src/App.jsx`
- `public/api/lead.php`
- `server/lib.php`
- `server/tests/handler.test.php`
- `docs/LANDING_CONTEXT.md`
- `docs/CRM_INTEGRATION_CONTEXT.md`

Созданы:

- `src/data/catalog.js`
- `src/components/catalog/CatalogCard.jsx`
- `src/components/catalog/CatalogDialog.jsx`
- `src/components/catalog/CatalogForm.jsx`
- `src/components/catalog/CatalogPlan.jsx`
- `src/components/catalog/CatalogSection.jsx`
- `source-assets/catalog/README.md`: описание обработки. Шесть master JPG остаются только локально, не входят в commit/PR.
- `public/photos/`:12 WebP из таблицы ниже.
- Этот отчёт `docs/CATALOG_IMPLEMENTATION.md`.

Старые секции и формы, helpers, tokens, config, retry, Actions, карты, цены калькулятора и callback schedule не изменены. В актуальной версии App также связывает Hero/Catalog/Quiz через callbacks и refs, без DOM-click hacks или глобальных событий.

## 2. Master JPG

`source-assets/catalog/podkova-{35,45,60}-{catalog,plan}.jpg`:6 только локальных оригиналов (игнорируются Git) 2048×1529, скопированы побайтно. Эта папка вне public и не копируется в dist. Никакого AI-редизайна, crop, смены цветов/фона/текста/планировки и sharpening.

## 3. Production WebP

Resize LANCZOS без upscale, WebP method6, фото quality90, планы quality95. Metadata не переносились. 640×478 и1280×956 — округление высоты с сохранением исходной пропорции; художественная композиция сохранена. Исходники и результат планировки визуально просмотрены, это не браузерная проверка responsive.

| Файл в public/photos | Размер px | Bytes | KiB |
| --- | --- | ---: | ---: |
| `podkova-35-catalog-1280.webp` | 1280×956 | 143,200 | 139.8 |
| `podkova-35-catalog-640.webp` | 640×478 | 40,476 | 39.5 |
| `podkova-35-plan-1280.webp` | 1280×956 | 75,954 | 74.2 |
| `podkova-35-plan-640.webp` | 640×478 | 25,046 | 24.5 |
| `podkova-45-catalog-1280.webp` | 1280×956 | 127,434 | 124.4 |
| `podkova-45-catalog-640.webp` | 640×478 | 42,746 | 41.7 |
| `podkova-45-plan-1280.webp` | 1280×956 | 75,892 | 74.1 |
| `podkova-45-plan-640.webp` | 640×478 | 25,096 | 24.5 |
| `podkova-60-catalog-1280.webp` | 1280×956 | 101,294 | 98.9 |
| `podkova-60-catalog-640.webp` | 640×478 | 33,204 | 32.4 |
| `podkova-60-plan-1280.webp` | 1280×956 | 81,160 | 79.3 |
| `podkova-60-plan-640.webp` | 640×478 | 30,458 | 29.7 |

## 4. CatalogSection

Порядок App: Header → Hero → **CatalogSection** → Works → Reviews → Quiz → SectionLocations → Calculator → Benefits → Comparison → Inside → Process → Showroom → FAQ → Final → Footer. Все остальные позиции сохранены.

`CatalogSection` управляет `{kind: plan|form, model}`. Три `CatalogCard` используют общий `ResponsivePhoto` и Button. «Планировка» и миниатюра объединены в одну Button link с aria-label модели: блок140×105 px (4:3), object-contain без crop, только существующий plan-640.webp через photoSrc, lazy и декоративный alt="". Подпись над изображением, gap8 px, слева, на всех ширинах; hover opacity90 и прежний focus-visible. mt-auto и одинаковый размер сохраняют выравнивание CTA. Поведение увеличенного viewer/аналитика не изменены; один клик — одно событие. `CatalogDialog` через native dialog/portal показывает `CatalogPlan` или `CatalogForm`; перехода plan→form нет. «Рассчитать стоимость» в карточках вызывает callback App → QuizSection.startNew(model, opener). Hero вызывает App → CatalogSection.openCatalog(opener), открывая ту же CatalogForm с CATALOG_ALL. Исходный opener фиксируется до autofocus формы и передаётся в CatalogDialog; close/Escape возвращают фокус. Ref-guard исключает повторный open/goal от двойного клика.

Фон forest, текст surface/muted-on-dark, потенциальная цена accent, Onest и прежние tokens. Открытые flex-column карточки, нижняя группа mt-auto, без новых рамок/теней/иконок и фиксированных высот текста. Grid как Works:1 колонка <600,2 от600,3 от1024; фото одинаковой пропорции2048/1529. Image sizes учитывают container/padding/gaps. Plan dialog: transparent shell, max-width960 px, padding16/24 px, нейтральный ink backdrop85%, заголовок20/24 px, изображение object-contain max65dvh; CTA отсутствует. Plan close48×48/glyph32, Escape/backdrop и геометрия viewer сохранены. Form dialog: surface/ink, max-width480 px, padding20/24 px; model subtitle14 px muted, gap12 px, label gap2 px, input min44 px и padding12/8 px, light Segmented, consent gap8 px, CTA mt16. Form close× — button44×44 px, glyph28 px aria-hidden, aria-label«Закрыть», focus-visible; header резервирует48 px справа. Dialog имеет viewport max-height, внутренний scroll, Escape/close и восстановление scroll/focus. Новых анимаций нет; существующие focus-visible/reduced-motion сохраняются.

## 5. Data contract

`src/data/catalog.js` экспортирует CATALOG_ALL (`id/crmCode: all`, title «Каталог всех моделей», не четвёртая карточка), CATALOG_MODELS, CATALOG_TITLE, CATALOG_SUBTITLE, CATALOG_IMAGE_RATIO, CATALOG_IMAGE_SIZES.

Каждая модель: `{id, crmCode, title, tagline, dimensions, sections, capacity, priceFrom, catalogImage, planImage, alt, planAlt}`. Имя image — basename без width/extension; ResponsivePhoto достраивает URL.

| id = crmCode | title | tagline | dimensions | sections | capacity | priceFrom |
| --- | --- | --- | --- | --- | --- | --- |
| podkova-35 | Подкова 3,5 м | Компактная для небольшого участка |3,5 ×2,4 м |2 секции |до4 чел. |null |
| podkova-45 | Подкова 4,5 м | Для семьи |4,5 ×2,4 м |2 секции |для 4–6 чел. |null |
| podkova-60 | Подкова 6 м | Три полноценные зоны |6 ×2,4 м |3 секции |для 5–8 чел. |null |

Null скрывает строку цены. Для будущей цены достаточно заполнить числовые priceFrom в data; это не изменит price_shown/OPPORTUNITY/калькулятор.

## 6. Payload формы

Телефон обязателен, имя необязательно max100, call/MAX выбран явно (default call), обязательное UI-согласие. Общие phone helpers, getUtm, submitLead, honeypot и минимальное время3 с; ref guard плюс disabled защищают от повторного submit во время sending. Error сохраняет ввод и предлагает телефон, done честно обещает работу менеджера. Автоматической доставки PDF нет.

Пример синтетический, содержит все поля POST после submitLead:

```json
{
  "form": "catalog",
  "catalog_model": "all",
  "phone": "+70000000000",
  "name": "Тест",
  "contact_method": "max",
  "utm_source": "yandex",
  "utm_medium": "cpc",
  "utm_campaign": "demo",
  "utm_content": "",
  "utm_term": "",
  "page_url": "https://banivyatki.ru/?utm_source=yandex&utm_medium=cpc",
  "submitted_at": "2026-10-08T06:00:00.000Z",
  "elapsed_ms": 8000,
  "website": "",
  "referrer": ""
}
```

Согласие не передаётся и не журналируется сервером, как в существующем контракте. React не знает вебхук и не вызывает REST напрямую. `submitLead.js` не изменён.

## 7. PHP

- BV_FORMS catalog: label «Каталог бань», title «Каталог».
- BV_CATALOG_MODELS — строго четыре кода: all и прежние podkova-35/45/60; доверенные серверные подписи.
- bv_catalog_valid проверяет raw phone/contact_method/catalog_model: string, method call/max, model enum. Нет coercion/trim до enum; неизвестный/отсутствующий/числовой/array/object ввод →400 bad_request, неверная строка номера →400 bad_phone. Сохраняется прежний antispam/rate-limit порядок перед schema.
- bv_build_lead сохраняет catalog_model ≤20 только для catalog, после raw validation. Это поле остаётся в очереди; retry применяет обновлённые COMMENTS без изменения retry.php.
- bv_deal_title для all добавляет «Все модели»; bv_deal_comments для all пишет только запрос общего каталога, без строки интересующей модели. Для трёх прежних кодов mapping не изменён.
- public/api/lead.php вызывает валидатор до нормализации номера/REST.
- CONTACT, SOURCE_ID, CATEGORY_ID, STAGE_ID, ASSIGNED_BY_ID, пользовательское поле связи и UTM используют прежний config/mapping. Модель не CONTACT/SOURCE_ID/OPPORTUNITY.
- Клиентские SOURCE_DESCRIPTION, CRM field code, request_text не принимаются; новый whitelist не копирует произвольные ключи. Старые общие поля whitelist сохранены.

## 8. Пример сделки

Общий каталог (`all`): TITLE `Сайт · Каталог · Все модели`. SOURCE_DESCRIPTION: `Каталог бань`. SOURCE_ID: прежний канал (Direct при yandex+cpc, иначе сайт, фактические IDs из private config).

```text
Форма: Каталог бань
Запрос: Каталог всех моделей
Способ связи: MAX
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

Для podkova-35/45/60 сохранены TITLE `Сайт · Каталог`, строка `Интересующая модель: <доверенное название>` и `Запрос: Отправить каталог бань`. Сервер продолжает принимать эти заявки от прежнего frontend/очереди.

Referrer при наличии добавляет «Переход с: …» перед временем. Для найденного CONTACT в начало добавляется «Повторное обращение» с ссылкой, если настроен portal_url. Новая сделка создаётся при каждом принятом обращении.

## 9. Analytics

| Goal | Когда | Params |
| --- | --- | --- |
| catalog_plan_open | Открытие планировки | `{model: crmCode}` |
| catalog_open | Hero открывает общий каталог | `{model: 'all'}` |
| catalog_submit | submitLead вернул ok:true | `{model: 'all'}` в новом Hero; прежние model codes совместимы |
| quiz_open | Карточка открывает новый квиз на первом вопросе | `{source: 'catalog_card', model: crmCode}` |

Телефон, имя, COMMENTS, другие PII в параметры целей не передаются. Локальные honeypot/too-fast success не вызывают catalog_submit. Серверный queued также означает ok/acceptance; это не гарантия доставки каталога. Счётчик не менялся; наличие целей в кабинете отдельно проверить.

## 10. Frontend build / DOM

Актуальные проверки CTA 20.10.2026 приведены в конце документа. Числа ниже относятся к первичной реализации каталога.

`npm run build`:успех, Vite7.3.6,96 modules. main147.44kB (gzip43.74), общий JS228.90kB (gzip72.05), CSS31.59kB (gzip7.16). npm выдаёт предупреждение переменной окружения http-proxy; build не блокирует. `git diff --check` пройден. Master JPG в dist отсутствуют;12 WebP присутствуют.

DOM harness вне репозитория:35 проверок пройдены (3 карточки, null-price,3 thumbnails только640 с декоративным alt, новые capacity, один plan goal при клике по thumbnail, plan→form, model context, invalid phone/consent, keyboard method, payload/UTM, sending guard, error/retained input, manual retry, success/analytics без PII, cancel/scroll/focus restore, close×, прозрачная plan shell, светлая компактная form shell). HTTP mocked, dialog polyfilled; это проверка UI-логики, **не реальный browser QA**. jsdom и локальные QA-зависимости не добавлены в package.json/lock.

## 11. PHP tests

PHP8.3 локально вне repo с curl/mbstring:

- `php server/tests/phone.test.php`:22 случая,успех.
- `php server/tests/handler.test.php`:83 проверки,успех.

Handler расширен на3 модели, exact TITLE/SOURCE_DESCRIPTION/полный COMMENTS, site/Direct, call/MAX, invalid raw types/enums/длины/пропуски, запрет клиентских CRM полей, CRM failure→queue и retry каждой модели. Старые сценарии, alias, phone, found contact, rate limit, config,10 attempts/failed и lock проходят; добавлен business regression. Тесты работают с синтетическим REST stub, не production Bitrix.

## 12. Ручное обновление Beget

**Обязательно только:** файл `server/lib.php` из этой ветки → `private/lib.php` рядом с public_html, сохранив существующие права. Не класть private library/config/queue/log в public_html.

`private/config.php` менять/заменять не требуется. `private/retry.php` не изменён, заменять не требуется; cron должен продолжать запускать его с обновлённой lib. `public/api/lead.php`, JS/CSS и public/photos приходят со сборкой через прежний workflow после разрешённого main merge. Actions private/lib не доставляет.

## 13. Безопасный порядок релиза

1. Сначала провести review и реальный browser QA шести ширин1440/1024/768/600/390/360, dialog keyboard/overflow и CLS.
2. Сделать приватную резервную копию действующей private/lib.php; сохранить действующий config и очереди. Не публиковать резервные файлы в public.
3. Загрузить новый server/lib.php как private/lib.php **до** нового endpoint/frontend. Старый endpoint может работать с новой lib; legacy контракты сохранены и протестированы.
4. Проверить PHP syntax на сервере/работу существующего сценария; подтвердить, что retry читает ту же private lib. Не запускать массовую отправку существующей очереди ради проверки.
5. Существующие цели каталога уже зарегистрированы по данным владельца; проверить параметры model:all и quiz_open source:catalog_card. Не менять идентификаторы целей и счётчик.
6. Только после отдельного согласования merge ветки в main: он автоматически запускает прежний Beget deploy endpoint + frontend. Не запускать workflow вручную до совместимого backend.
7. После деплоя открыть планировки и формы; выполнить синтетическую заявку, проверить модель, TITLE/SOURCE_DESCRIPTION/COMMENTS/источник/contact/method/UTM в CRM. Проверить queue/log и cron без раскрытия личных данных/credentials.
8. При откате сначала вернуть frontend/endpoint к старой сборке. Новая private lib совместима со старыми формами; **не возвращать старую lib при наличии catalog jobs в queue**, иначе retry потеряет понимание form/model. Сохранить новую lib до обработки catalog jobs или отдельно согласовать migration.

## 14. Блокеры и риски

- Master JPG запрещено публиковать: они удалены из tracking и истории публикуемой ветки; все6 файлов сохранены на диске. В PR только production WebP и README pipeline. Исторический блокер публикации оригиналов снят их исключением, разрешение на публикацию оригиналов не запрашивается.

- Реальные браузерные проверки1440/1024/768/600/390/360, pixel layout, overflow, native focus trap/Escape и CLS **не выполнены**: локальный Chrome SIGSEGV, cloud browser не видит localhost. Код содержит responsive/size/a11y правила, но их недостаточно для заявления о пройденной visual QA. Это остаётся обязательной проверкой до production.
- Новый Hero требует новую private/lib: прежний backend принимает catalog для трёх моделей, но отвергает all с400. Endpoint в этой правке не меняется. Удалённый сервер не обновлялся.
- Существующие idempotency/duplicate/timeouts/queue risks сохранены: браузер15с, несколько REST calls могут продолжаться дольше; manual retry/неопределённый ответ deal.add способны создать дубль. Automatic frontend retry не добавлен.
- Ответ ok может означать queue acceptance или server antispam drop. Нет автоматического каталога/PDF/MAX delivery; менеджер и cron необходимы.
- Старый общий whitelist допускает обычные option/comment/price fields для различных form; catalog UI их не отправляет. Это существующая архитектура, не отдельная per-form схема всего payload.
- Private config/вебхук/права/реальные IDs и настройка целей не подтверждены репозиторием и этой проверкой.

## Проверки CTA от 20.10.2026

- `npm run build`: успешно, 103 модуля; package.json/lock и зависимости приложения не изменены.
- `php server/tests/phone.test.php`: 22 проверки; `php server/tests/handler.test.php`: 228 проверок на PHP8.3.6 с curl/mbstring. Добавлены all/call/MAX, точные CRM-поля, все UTM, неизвестные enum, общий каталог в queue/retry; старые три модели и остальные формы проходят.
- `scripts/tests/quiz.dom.mjs`: 100 проверок; `scripts/tests/cta.dom.mjs`: 54 проверки полного App в React StrictMode. Проверены новые CTA, reset/resume, focus, отсутствие двойных целей/submit, сохранение контактов, late success/error при новой попытке и общий HTTP-lock. HTTP mocked; dialog polyfilled.
- `scripts/tests/cta.browser.mjs`: 121 проверка в реальном Chromium153 на локальном Vite production build, ширины360/390/768/1024/1440. Загружен Onest; проверены карточки/CTA, горизонтальный overflow, открытие без прокрутки, native dialog/focus/Escape, возврат focus, планировки/backdrop и общий catalog payload. Скриншоты Hero/карточек/формы/планировки/квиза просмотрены выборочно. Новых визуальных изменений сверх задания не внесено.
- `git diff --check`: без ошибок. Browser запускает Vite preview только на127.0.0.1; HTTP формы mocked, production Метрика/CRM/карты/embeds блокируются. Public deployment не создавался.
- Это не проверка production Beget/Bitrix24, живого счётчика, внешней карты, реальных iOS/Safari/Android или полного CLS-аудита. Прежние записи о недоступности Chrome относятся к октябрьским проверкам до этой актуализации.

QA-зависимости установлены вне repo. Команды DOM: `BV_JSDOM_PATH=/path/to/jsdom/lib/api.js node scripts/tests/quiz.dom.mjs` и аналогично `cta.dom.mjs`. Browser: после build выполнить `BV_PLAYWRIGHT_PATH=/path/to/playwright-core/index.mjs BV_CHROMIUM_PATH=/path/to/chromium node scripts/tests/cta.browser.mjs`; шрифт может загружаться из Google Fonts либо из локального QA-кеша через `BV_FONT_CACHE`. PHP CLI/extensions могут быть предоставлены через PATH; тесты сами поднимают локальные HTTP/REST stubs.

**Release gate:** вручную доставить совместимый `server/lib.php` как `private/lib.php` на Beget и проверить старые формы; затем, только после разрешения владельца, merge/frontend deployment. При наличии all jobs не откатывать private lib к версии без all. В этой работе main, production, private config и Beget не изменялись; merge/auto-merge/deploy не выполнялись.
