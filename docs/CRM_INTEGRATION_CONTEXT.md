# Технический контекст интеграции banivyatki.ru → Битрикс24

Инвентаризация: **8 октября 2026 года**. Репозиторий `volkov43-beep/banivyatki-landing`, базовый HEAD `bdca6c33b3d9051ec2ae78d32e8721f00ec56005`, актуализация по ветке `feature/catalog-models`.

Документ основан на текущих React/PHP-файлах, образце конфигурации, тестах и workflow. Действующий сервер, приватный конфиг, Битрикс24, cron и кабинет Метрики не проверялись. Значения секретов, credentials и URL вебхука не приводятся, в том числе в примерах. Все примеры данных ниже синтетические: телефон состоит из нулей, имя/ответы/UTM вымышленные. Имена конфигурационных ключей обозначают структуру, а не раскрывают значения.

**Актуализировано по ветке `feature/catalog-models`: catalog реализован в коде, но production этой работой не публиковался.** Квиз остаётся рекомендацией, `form: quiz` не поддерживается. Старые формы/mapping, config, queue/retry, workflow и счётчик не изменены. Master JPG остаются только локально и исключены из Git правилом `/source-assets/catalog/*.jpg`. Проверки: PHP8.3 phone22, handler83; DOM35; build пройден. Внешние кабинеты не проверялись.

Краткий вывод: текущий backend создаёт **CONTACT и DEAL, не CRM LEAD**. Канал рекламы отражает `SOURCE_ID`, тип обращения — уникальная подпись `SOURCE_DESCRIPTION` из `BV_FORMS`. Для новых сценариев требуется согласованное расширение серверного контракта; просто добавить поля React недостаточно.

## 1. Текущая цепочка отправки заявки

### 1.1. Пошаговый путь с файлами и функциями

| Этап | Файл / функция | Фактическое поведение |
| --- | --- | --- |
| React-форма | `src/components/calculator/LeadForm.jsx`, `showroom/VisitForm.jsx`, `FaqQuestionForm.jsx`, `FinalForm.jsx`; локальные `handleSubmit` | Проверяет телефон и согласие; FAQ также непустой вопрос; составляет payload. `sending` отключает кнопку, `done` показывает inline success, `error` сохраняет ввод |
| Данные расчёта | `src/components/SectionCalculator.jsx` → props `lead` общей LeadForm | Передаёт season, card_id, card_title, size, option_shown, price_shown; выбирает `variant` и success goal |
| Телефон | `src/lib/phone.js`: `formatPhone`, `isCompletePhone`, `normalizePhone` | Маска и нормализация на frontend; повторная проверка есть на сервере |
| Метки | `src/main.jsx` → `captureUtm`; `src/lib/utm.js`: `getUtm` | Пять UTM из URL/sessionStorage, включаются в payload |
| Время / antispam | React `mountedAt`, `MIN_FILL_MS`, скрытое `website`; `src/lib/callback.js` | Минимум 3 секунды; ловушка/быстрая отправка дают локальный done без HTTP и без цели. Callback-функции формируют обещание звонка, не ставят задачу CRM |
| Frontend helper | `src/lib/submitLead.js`: `submitLead(payload)` | Добавляет document.referrer; отправляет JSON; только HTTP ok + `ok:true` считает успехом |
| HTTP | `LEAD_ENDPOINT` в том же файле | POST `${BASE_URL}api/lead.php`, при текущем base — `/api/lead.php`; credentials omit, timeout 15 с |
| Публичный PHP | `public/api/lead.php`: `bv_respond`, основной код endpoint | Загружает приватную библиотеку, проверяет метод/Origin/JSON/antispam/rate limit/form/phone/config, строит lead, вызывает REST или очередь |
| Приватная PHP-библиотека | `server/lib.php` → на сервере `private/lib.php` | Все функции контракта, CRM mapping, REST, очереди, журналов и лимитов |
| Нормализованная заявка | `bv_form_name`, `bv_normalize_phone`, `bv_build_lead`, `bv_str` | Канонический form и whitelist известного набора полей; прочие ключи отбрасываются |
| Конфигурация | `bv_load_config` → `private/config.php`; образец `server/config.sample.php` | Читает секретный доступ и публично не установленные настройки полей/воронки/источников |
| REST | `bv_send_lead`, `bv_bitrix_call` | Поиск CONTACT по PHONE → при отсутствии contact.add → deal.add |
| CONTACT | `bv_contact_fields` | Новый контакт с именем, телефоном, ответственным, OPENED и настроенными UTM; найденный контакт не обновляется |
| DEAL | `bv_deal_fields`, `bv_deal_title`, `bv_deal_comments`, `bv_utm_fields` | Создаёт новую сделку со связанным контактом, каналом, типом формы, контекстом и UTM |
| Очередь | `bv_queue_put`, затем `bv_queue_write` | При REST failure сохраняет нормализованную lead и ошибку, включая полученный contact_id; frontend получает ok, если запись удалась |
| Retry | `server/retry.php` → `private/retry.php`, CLI | По cron заново вызывает `bv_send_lead`; success удаляет job, неудачи обновляют попытки, лимит ведёт в failed |
| Analytics | React после ok → `src/lib/track.js`: `track(goal, params)` | Успешная цель означает ответ ok обработчика, включая принятие в очередь; не доказательство появления сделки |

### 1.2. Точная последовательность endpoint

После подключения библиотеки endpoint выполняет проверки в таком порядке:

1. Метод POST, иначе 405 `method_not_allowed`.
2. Origin, если передан: основной домен либо www-вариант; иначе 403 `forbidden`. Без Origin допустимо.
3. Непустое тело до 65 536 байт, `json_decode(..., true)`, результат PHP array; иначе 400 `bad_json`.
4. Непустое `website` → журнал dropped/honeypot, **200 ok без CRM**.
5. `elapsed_ms` не numeric либо после `(int)` меньше 3000 → dropped/too_fast, **200 ok без CRM**.
6. Загрузка config для определения IP; файловый rate limit 5 запросов за 600 с → 429 `too_many_requests`.
7. Поддерживаемый form и непустой phone → иначе 400 `bad_request`. `bv_catalog_valid($data, $form)` проверяет catalog raw strings и enums до нормализации; отказ →400 `bad_request`. Затем неверная строка телефона →400 `bad_phone`. Для остальных form валидатор возвращает true и сохраняет прежнее поведение.
8. Проверка результата загрузки config → 500 `server_config`, если он недоступен/неполон.
9. `bv_build_lead` → `bv_send_lead`. Успех REST → журнал sent, 200 ok.
10. Ошибка REST → `bv_queue_put($res['lead'], $res['error'])`; успешная запись → queued, 200 ok; неудачная → lost, 500 `server_error`.

Следствие порядка: неизвестный form даёт 400 **после прохождения** antispam/rate limit. При пустом elapsed или заполненной ловушке даже неизвестный form может получить 200 dropped. Rate limit учитывает и некоторые невалидные заявки; он выполняется до проверки form/phone. Библиотека подключается до проверки метода: если private/lib.php отсутствует, будет 500, а не обычный GET 405.

Обработчики исключений/фатальных ошибок отключают display_errors и возвращают короткий JSON `server_error`. Content-Type запроса сервер отдельно не проверяет: проверяется декодируемое JSON-тело. JSON list тоже является array при decode, но обычно не пройдёт обязательные ключи. Limit тела проверяется после чтения php://input, не является предварительным ограничением объёма чтения.

### 1.3. Файлы на хостинге и границы деплоя

```text
папка сайта/
  public_html/api/lead.php      из public/api/lead.php, публикуется сборкой
  private/config.php           реальные настройки, отсутствуют в git
  private/lib.php              копия server/lib.php, отдельно размещается
  private/retry.php            копия server/retry.php, отдельно размещается
  private/queue/*.json          нормализованные заявки, персональные данные
  private/queue/failed/*.json   исчерпавшие попытки / повреждённые jobs
  private/log/                 дневные журналы
  private/ratelimit/           счётчики IP
  private/retry.lock           блокировка retry
```

PHP endpoint вычисляет путь `dirname(__DIR__, 2) . '/private/lib.php'`; приватные файлы должны быть рядом с public_html, а не внутри него. PHP использует cURL, mbstring, JSON, файловый доступ и CLI. Cron раз в 5 минут описан в комментарии retry; наличие задания на сервере по GitHub установить нельзя.

`.github/workflows/deploy-beget.yml` публикует dist по FTPS, включая public/api/lead.php. Vite не включает server/ в dist: `private/lib.php`/retry/config **не обновляются этим workflow**. Новый frontend и endpoint нельзя считать совместимыми с действующим приватным PHP без отдельной доставки/проверки. Изменение main запускает публикацию; текущая инвентаризация ничего не публикует.

## 2. Существующие типы форм

### 2.1. Поддерживаемые значения form и frontend

Шесть канонических типов в `BV_FORMS`, плюс единственный alias `calc → calculator`. Строки регистрозависимы, не trim: `Calculator`, ` calculator ` и `quiz` сейчас не поддерживаются; `catalog` поддерживается.

| Входной form | Компонент / место | Поля UI | Дополнительный frontend-контекст | Что PHP сохраняет из специфичного контекста | Success goal |
| --- | --- | --- | --- | --- | --- |
| `calculator` | `src/components/calculator/LeadForm.jsx`, из SectionCalculator | Телефон, имя необязательно, call/max, согласие | season, card_id, card_title, size, option_shown, price_shown | option_shown, price_shown; season/card_id/card_title/size **отбрасываются** | `calc_submit` |
| `business` | Тот же LeadForm, вкладка бизнеса | Телефон, имя, company, comment, call/max, согласие | company/comment; технические пустые season/card_id/card_title/size, price_shown null | company/comment; общий whitelist также принимает option_shown/price_shown, но текущий UI их не задаёт для бизнеса | `business_submit` |
| `visit` | `src/components/showroom/VisitForm.jsx`, SectionShowroom | showroom/production/video, имя, телефон, call/max, согласие | visit_type | visit_type | `visit_submit`, params `{type: visitType}` |
| `faq_question` | `src/components/FaqQuestionForm.jsx`, SectionFaq | Обязательный вопрос, имя, телефон, call/max, согласие | question | question | `faq_question_submit` |
| `catalog` | `src/components/catalog/CatalogForm.jsx`, CatalogSection/Dialog | Телефон, имя необязательно, call/max, обязательное UI-согласие | catalog_model выбранной модели, общие metadata | C + catalog_model; строгая validation новых enum | `catalog_submit {model}` |
| `final` | `src/components/FinalForm.jsx`, SectionFinal | Имя необязательно, телефон, call/max, согласие | Дополнительных бизнес-полей нет | Общие поля | `final_submit` |
| `calc` | Отдельного React-компонента нет; backend совместимость | Как calculator для внешнего совместимого отправителя | Аналог calculator | Канонизируется в calculator | Автоматической цели backend нет; текущий React использует calculator/calc_submit |

Во всех текущих UI обязательны полный телефон и checkbox согласия; остальные общие поля имени необязательны. Согласие не входит в payload. FAQ требует вопрос только на frontend — endpoint **не проверяет его обязательность**. Server whitelist общий для всех form: например, отправленный вручную `company` при final или `question` при visit не отклоняется и может попасть в COMMENTS.

Общие сохраняемые поля `C`: form, phone, name, contact_method, option_shown, price_shown, visit_type, question, company, comment, page_url, referrer, submitted_at и пять UTM. Для catalog дополнительно сохраняется `catalog_model` ≤20, другие формы его не сохраняют. Остальной whitelist одинаков для каждой строки таблицы; столбец специфичного контекста показывает нормальную отправку существующего UI, не ограничения per-form. `website`/elapsed проверяются до build, но не сохраняются в lead.

### 2.2. Результат CRM для каждого типа

Общий CONTACT mapping `K`: новый контакт — NAME/PHONE WORK/ASSIGNED_BY_ID/OPENED и настроенные contact UTM; найденный — используется прежний ID без update. Общий DEAL mapping `D`: TITLE/CATEGORY_ID/STAGE_ID/ASSIGNED_BY_ID/CONTACT_ID/SOURCE_ID/SOURCE_DESCRIPTION/COMMENTS, настроенные deal UTM и пользовательское поле связи. Для каждой строки ниже K и D одинаковы; специфичных CONTACT-полей формы нет.

Правило источника `S`: `source_direct` при `utm_source=yandex` + `utm_medium=cpc` без учёта регистра и непустом source_direct; иначе `source_site`. Для каждого form это одно и то же правило, не отдельный SOURCE_ID по форме.

| Канонический form | CONTACT / DEAL | TITLE в обычном сценарии UI | SOURCE_ID | SOURCE_DESCRIPTION (точная строка) | Специфика COMMENTS | UTM |
| --- | --- | --- | --- | --- | --- | --- |
| catalog | K / D | `Сайт · Каталог` | S | `Каталог бань` | Форма, доверенная модель, серверный запрос + общие строки | Все 5 по общему mapping |
| calculator | K / D | `Сайт · Расчёт · <option_shown> · от <price_shown> ₽`; пустые вариант/цена пропускаются | S | `Калькулятор` | Форма, выбранный вариант, показанная цена + общие строки | Все 5 в COMMENTS при наличии; в поля K/D только по respective mapping |
| business | K / D | `Сайт · Для бизнеса`; build/title также умеют добавить вариант/цену, если они присланы | S | `Калькулятор, для бизнеса` | Форма, компания, комментарий + общие строки | То же |
| visit | K / D | `Сайт · Запись: шоурум` / `производство` / `видеозвонок`; неизвестный/пустой тип даёт `Сайт · Запись` | S | `Запись на просмотр` | Форма, тип визита + общие строки | То же |
| faq_question | K / D | `Сайт · Вопрос` | S | `Вопрос из FAQ` | Форма, вопрос + общие строки | То же |
| final | K / D | `Сайт · Расчёт` | S | `Форма внизу страницы` | Форма + общие строки | То же |
| calc (alias) | K / D как calculator | Как calculator | S | `Калькулятор` | Как calculator; исходное alias не сохраняется | То же |

Общие COMMENTS: способ связи, URL страницы, referrer, время отправки по Москве, непустые UTM; для найденного контакта первая строка «Повторное обращение» с опциональной ссылкой на контакт. Везде могут появиться другие известные whitelist-поля, если их прислал caller: генератор не ограничивает строки COMMENTS типом формы.

## 3. Серверный whitelist и валидация

### 3.1. Все места ограничения контракта

| Ограничение | Файл / функция / константа | Текущее правило |
| --- | --- | --- |
| Метод, Origin, body | `public/api/lead.php`, BV_ALLOWED_ORIGINS, BV_MAX_BODY | POST, два разрешённых origin либо отсутствие, JSON array после decode, ≤65 536 байт |
| Antispam | Тот же файл, BV_HONEYPOT_FIELD, BV_MIN_ELAPSED_MS | website empty, elapsed numeric и int ≥3000; иначе dropped/200 |
| Rate limit | Тот же файл BV_RATE_LIMIT/BV_RATE_WINDOW; `server/lib.php::bv_rate_limited` | 5/600 с на IP; источник IP configurable; при проблеме хранения лимит fail-open |
| Тип формы | `server/lib.php::BV_FORMS`, BV_FORM_ALIASES, bv_form_name | Только шесть типов + calc alias; raw form должен быть string |
| Обязательные поля | `public/api/lead.php`, шаг 7 | Поддерживаемый form и непустой phone; последующая нормализация phone |
| Телефон | `server/lib.php::bv_normalize_phone` | string/int; очищает недигиты; 10 цифр либо 11 с первой 7/8; иначе null |
| Допустимые поля | `server/lib.php::bv_build_lead` | Фиксированный общий массив + BV_UTM_KEYS; неизвестные ключи не доходят ни до очереди, ни до CRM |
| Строки | `server/lib.php::bv_str` | int/float преобразуются в string; non-string остальных типов → пусто; trim, удаление части control chars, mb_substr |
| Catalog schema | `server/lib.php::bv_catalog_valid`, вызов `public/api/lead.php` | Только catalog: raw phone/contact_method/catalog_model должны быть string; contact_method call/max; модель строго BV_CATALOG_MODELS (без trim/coercion). Отказ400 до REST/queue |
| Цена | `server/lib.php::bv_build_lead` | is_numeric и float >0, затем int; иначе null; нет отдельного верхнего предела или строгого integer-only правила |
| Справочники | BV_VISIT_TYPES, BV_CONTACT_METHODS | Используются для подписи/форматирования; **не являются строгой validation на входе** |
| UTM | BV_UTM_KEYS, bv_utm_fields | Пять фиксированных ключей; string mapping nonempty и nonempty value |
| Дата | bv_submitted_text | Парсит строку DateTimeImmutable, при неудаче текущее время; преобразует в Москву |
| Настройки | bv_load_config | Config должен вернуть array; 5 ключей должны быть isset и не `''`; строгой проверки типов/REST-кодов нет |
| Queue job | `server/retry.php` | Проверяет job array и lead array; не повторяет полноценную endpoint validation |

Набор обязательных config-ключей: `webhook_url`, `assigned_by_id`, `deal_category_id`, `deal_stage_id`, `source_site`. Числовая категория 0 проходит. Конфиг доверенный, не пользовательский input; например, mapping UTM может называться любым непустым string-кодом, существование этого поля проверяется лишь реакцией REST.

### 3.2. Поля нормализованной lead

| Поле | Тип / длина после обработки | Что важно |
| --- | --- | --- |
| form | Канонический string из BV_FORMS | До build уже проверен |
| phone | Нормализованный `+7` и 10 цифр | Нет проверки принадлежности номера/реального оператора |
| name | string ≤100 символов | Пустое допустимо, CONTACT получает fallback |
| contact_method | string ≤20 | Старые формы: неизвестный enum не reject. Catalog: обязателен raw string call/max, иначе400 |
| catalog_model | string ≤20, только catalog | Обязателен podkova-35/podkova-45/podkova-60; raw arrays/objects/numbers/unknown/long отклоняются до обрезания |
| option_shown | string ≤200 | Любая присланная строка, не сверяется с data/calculator.js |
| price_shown | int либо null | Принимает numeric string/float, дробь обрезается; сумма не задаётся как OPPORTUNITY |
| visit_type | string ≤20 | Нет обязательности/strict enum даже при form visit |
| question | string ≤2000 | Нет обязательности для faq_question на PHP |
| company | string ≤200 | Только текст COMMENTS, не COMPANY_ID/CRM COMPANY |
| comment | string ≤2000 | Общий COMMENTS-текст, не отдельная запись ленты |
| page_url, referrer | Каждый string ≤500 | Не URL-validation; присланные строки не считаются доверенным доказательством источника |
| submitted_at | string ≤40 | Дата не отвергается; invalid заменяется серверным временем при форматировании |
| utm_source, utm_medium, utm_campaign, utm_content, utm_term | Каждый string ≤200 | Пустые сохраняются в lead, но пропускаются в CRM fields/строке меток |

`bv_str` ограничивает длину в символах mbstring, не в байтах. Оставляет переносы строк, carriage return и tab; не выполняет HTML escaping. Передача строки с переносом может нарушить читаемость структуры COMMENTS. Как конкретный интерфейс Битрикс24 отображает HTML, по этому коду не устанавливается; произвольную разметку и строки дополнительных CRM-полей из клиента принимать не рекомендуется.

Не сохраняются: season/card_id/card_title/size, website/elapsed_ms, checkbox consent, произвольные `quiz_answers`, `quiz_*`, любые `catalog_*` кроме разрешённого catalog_model, дополнительные frontend поля. contact_id/contact_found добавляет **сервер** после REST, а не копирует из публичного payload.

Строгой server validation вопроса, связи и типа визита сейчас нет. В этом документе они описаны как ограничение реализации; исправлять их для старых сценариев в рамках добавления новой формы без отдельной задачи не следует.

### 3.3. Реализованное расширение catalog и будущий quiz

Catalog добавлен в BV_FORMS (`Каталог бань` / `Каталог`), BV_CATALOG_MODELS, bv_catalog_valid, условный whitelist bv_build_lead и bv_deal_comments в `server/lib.php`; endpoint вызывает проверку. Ни один клиентский label, SOURCE_DESCRIPTION, UF code или request_text не копируется в CRM. Подписи моделей доверенные, серверные. `catalog_model` сохраняется в queue как часть lead; retry.php не изменён и использует обновлённую lib. Quiz потребует отдельной схемы, whitelist/enum/version, COMMENTS, endpoint validation и тестов; просто BV_FORMS недостаточно. Подробный checklist — раздел7.

## 4. Mapping в Битрикс24

### 4.1. CONTACT

`bv_send_lead` сначала вызывает `crm.duplicate.findbycomm` с type PHONE, values `[phone]`, entity_type CONTACT. При нескольких найденных ID берётся первый. При отсутствии — `crm.contact.add` с fields из bv_contact_fields.

| Поле CONTACT | Источник | Правило |
| --- | --- | --- |
| NAME | lead.name | Непустое имя; иначе «Клиент с сайта» |
| PHONE | lead.phone | Массив значений, VALUE нормализован, VALUE_TYPE WORK |
| ASSIGNED_BY_ID | cfg.assigned_by_id | Конкретный ID неизвестен по GitHub |
| OPENED | Код | `Y` |
| UTM_* либо иные настроенные коды | cfg.contact_utm_fields | Только непустые метки по mapping; реальные field codes не устанавливаются по sample |

Найденный контакт не получает contact.update: новый name/UTM не записываются. EMAIL, LAST_NAME, COMPANY_ID, source/form-specific поля, quiz answers в CONTACT не добавляются. contact_id и contact_found после поиска/создания записываются в нормализованную lead для безопаснее повторной попытки; это не дедупликация сделки.

### 4.2. DEAL

| Поле DEAL | Функция / источник | Что зависит от private config |
| --- | --- | --- |
| TITLE | bv_deal_title, BV_FORMS, option_shown/price_shown/visit_type | Текст определяется кодом, не config |
| CATEGORY_ID | cfg.deal_category_id | Воронка одна для всех form; значение неизвестно |
| STAGE_ID | cfg.deal_stage_id | Стартовая стадия одна для всех; нужен реальный REST code, не просто имя стадии |
| ASSIGNED_BY_ID | cfg.assigned_by_id | Один ответственный для всех; значение неизвестно |
| CONTACT_ID | Результат findbycomm/contact.add | Динамический ID, не input посетителя |
| SOURCE_ID | bv_deal_fields и UTM | Используется cfg.source_site либо cfg.source_direct |
| SOURCE_DESCRIPTION | BV_FORMS[form].label | Уникальный человекочитаемый тип формы, кодом, не config |
| COMMENTS | bv_deal_comments | Данные + серверные labels; portal_url влияет только на ссылку повторного контакта |
| Пользовательское поле способа связи | cfg.contact_method_field, cfg.contact_method_call/max | Field code и подходящие portal values (например ID списка) неизвестны; пустой код/значение — поле не заполняется |
| Пять UTM | bv_utm_fields(cfg.deal_utm_fields, lead) | Field mapping configurable; непустой input всегда ещё доступен в COMMENTS |

`OPPORTUNITY`, CURRENCY_ID, COMPANY_ID, отдельное поле form_code, ответы квиза и поле «каталог» не заполняются. Цена — контекст показанного предложения в TITLE/COMMENTS. Company формы бизнеса — строка «Компания: …» в COMMENTS, не отдельная CRM-компания.

`bv_contact_fields`/bv_deal_fields добавляют UTM через PHP array union `+`: уже имеющиеся стандартные keys не переопределяются UTM. При ошибочном mapping двух меток в один код внутри bv_utm_fields победит последняя обработанная метка. Код поля связи также берётся из доверенного config; ошибочная настройка может конфликтовать со стандартным полем, поэтому реальные настройки требуют проверки.

### 4.3. Граница достоверности

По репозиторию установлены названия полей, порядок REST, captions форм и алгоритмы. **Не установлены** рабочий webhook/права доступа, значения воронки/стадии/ответственного/источников, тип и значения пользовательского поля, UTM mapping на рабочем портале, наличие/права записи этих полей, реальная версия private PHP на Beget. Sample содержит пустые настройки, tests — фиктивный config; их нельзя трактовать как production значения. Не следует переносить значения из переписки в документ как факт конфигурации сервера без отдельной проверки.

## 5. Источник заявки: канал, сценарий, конкретный CTA

### 5.1. Как выбирается SOURCE_ID

В `bv_deal_fields`:

```text
если utm_source равен yandex без учёта регистра
  И utm_medium равен cpc без учёта регистра
  И config source_direct непустой по PHP empty
→ SOURCE_ID = config source_direct
иначе
→ SOURCE_ID = config source_site
```

Все формы используют один алгоритм. Referrer, URL, имя CTA, visit type, компания и данные ответа не участвуют. Любая другая рекламная система/medium попадает в источник сайта; детали могут сохраняться в UTM/COMMENTS. Когда source_direct не настроен, Директ тоже получает source_site. Значение `'0'` PHP считает empty — учитывать при настройке кодов, если такое значение используется.

Frontend хранит UTM в sessionStorage `bv_utm`. Новые UTM из URL перезаписывают весь набор, URL без UTM сохраняет прежний; хранение в рамках вкладки, не полноценный неизменяемый first touch. Пользователь может прислать UTM вручную; SOURCE_ID не является проверенным доказательством рекламного происхождения. URL страницы тоже клиентский input.

### 5.2. Можно ли отличить формы по сделке сейчас?

**Да, для каждого из шести канонических сценариев — по SOURCE_DESCRIPTION.** Он всегда ставится сервером из BV_FORMS. Дублирующее указание есть первой содержательной строкой COMMENTS: `Форма: <label>`. TITLE помогает, но final и calculator могут иметь одинаковое «Сайт · Расчёт», поэтому TITLE не надёжный единственный discriminator. SOURCE_ID показывает канал и не различает формы.

| Сценарий | Отличительный SOURCE_DESCRIPTION | Что можно определить дополнительно |
| --- | --- | --- |
| Обычная финальная форма | Форма внизу страницы | Тип обращения final |
| Калькулятор | Калькулятор | Выбранный вариант и показанная цена из COMMENTS |
| Бизнес-заявка | Калькулятор, для бизнеса | Компания/комментарий при заполнении |
| Запись | Запись на просмотр | Шоурум/производство/видео из COMMENTS и TITLE; один form visit для всех |
| Вопрос | Вопрос из FAQ | Текст вопроса из COMMENTS |
| Каталог | Каталог бань | COMMENTS: доверенная модель и запрос; отдельный form catalog |
| Будущий квиз | Пока неизвестный form, сделка обычным путём не создаётся | Рекомендация: отдельный label «Квиз подбора бани» |

**Конкретный CTA внутри страницы определить однозначно нельзя.** Одну форму калькулятора открывают hero, работы, преимущества и сравнение; visit может быть открыт карточкой или FAQ. Имя открывающего CTA не входит в lead/DEAL. Goals клика существуют отдельно, но отдельная сделка не связана с ними request ID. Alias calc также неотличим от calculator, что соответствует его назначению.

Минимум для новых **сценариев** — добавить разные BV_FORMS labels и серверный контекст: дополнительное пользовательское CRM поле необязательно. Если требуется различать **точку открытия одной и той же формы**, предложить будущий `cta_id` из закрытого server whitelist, фиксировать его при открытии, сохранять в lead/queue и писать `Точка обращения: …` в COMMENTS. Не заменять им SOURCE_ID. Если нужен устойчивый machine-readable код для отчётов/роботов CRM, отдельное config-mapped UF поле form_code/cta_id полезно как следующая задача; сейчас такого поля нет. Не использовать URL query как единственный идентификатор CTA и не принимать произвольный SOURCE_DESCRIPTION от браузера.

## 6. Генерация COMMENTS сделки

### 6.1. Фактический порядок строк

`server/lib.php::bv_deal_comments($cfg, $lead, $contactFound, $contactId)`:

1. Если контакт найден: «Повторное обращение», с опциональной ссылкой на контакт из portal_url.
2. `Форма: <BV_FORMS label>` — всегда. Для catalog сразу после неё: «Интересующая модель: …» из BV_CATALOG_MODELS и серверная строка «Запрос: Отправить каталог бань». Для catalog сразу после неё: «Интересующая модель: …» из BV_CATALOG_MODELS и серверная строка «Запрос: Отправить каталог бань».
3. `Выбранный вариант: <option_shown>` — если непустой.
4. `Показанная цена: от <price_shown> ₽` — если truthy.
5. `Способ связи: Звонок/MAX` — если значение есть в BV_CONTACT_METHODS.
6. `Тип визита: Шоурум/Производство/Видеозвонок` — если значение есть в BV_VISIT_TYPES.
7. `Вопрос: <question>` — непустой.
8. `Компания: <company>` — непустой.
9. `Комментарий: <comment>` — непустой.
10. `Страница: <page_url>` — непустой.
11. `Переход с: <referrer>` — непустой.
12. `Время отправки: DD.MM.YYYY HH:MM (МСК)` — всегда, parse ISO или fallback сейчас.
13. `Метки: utm_source=…, utm_medium=…, utm_campaign=…, utm_content=…, utm_term=…` — только непустые, в указанном порядке.

Объединение `implode("\n", $lines)`, без markdown-таблиц/HTML-шаблона. Нет общего лимита итогового COMMENTS сверх длин отдельных полей/body. Submitted_at принимается от клиента и не является достоверным серверным временем создания. При найденном контакте его ссылка формируется server-side; здесь никаких реальных portal URL не приводится.

### 6.2. Примеры для всех существующих типов

Примеры отражают обычные payload UI с заполненными вымышленными значениями. Пустые строки/неприсланные метки будут отсутствовать. Для любого примера с найденным контактом в начало добавится строка «Повторное обращение».

**calculator** (alias calc даст тот же результат):

```text
Форма: Калькулятор
Выбранный вариант: 4–4,5 м, тёплый сезон
Показанная цена: от 330 000 ₽
Способ связи: Звонок
Страница: https://banivyatki.ru/
Переход с: https://example.org/
Время отправки: 08.10.2026 09:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

**business**:

```text
Форма: Калькулятор, для бизнеса
Способ связи: MAX
Компания: Демонстрационный глэмпинг
Комментарий: Нужны две бани для базы отдыха
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

**visit**:

```text
Форма: Запись на просмотр
Способ связи: Звонок
Тип визита: Шоурум
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
```

Для production/video меняется строка «Тип визита», а не подпись формы. **faq_question**:

```text
Форма: Вопрос из FAQ
Способ связи: MAX
Вопрос: Можно ли поставить баню на участке с узким въездом?
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
```

**final**:

```text
Форма: Форма внизу страницы
Способ связи: Звонок
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

Нормальный UI бизнеса не передаёт вариант/цену, поэтому их нет в примере. Но server-функция добавит эти строки при присланных значениях и для других форм; whitelist не является per-form схемой.

### 6.3. Catalog реализован; quiz — рекомендация

Сохранить существующий префикс `Форма:`, чтобы не вводить параллельно «Источник формы» и не смешивать форму с каналом SOURCE_ID. Заголовки/порядок блоков генерировать сервером, labels ответов из фиксированного словаря, не из произвольного клиентского текста.

**Каталог**, фактические SOURCE_DESCRIPTION «Каталог бань», TITLE «Сайт · Каталог»:

```text
Форма: Каталог бань
Интересующая модель: Подкова 4,5 м
Запрос: Отправить каталог бань
Способ связи: MAX
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

Строка «Запрос» серверная константа для catalog; отдельный payload `request_text` не нужен. Менеджер отправляет каталог вручную. Success должен обещать связь/отправку менеджером, не «каталог уже отправлен».

**Квиз**, рекомендуемые SOURCE_DESCRIPTION «Квиз подбора бани», TITLE «Сайт · Квиз»:

```text
Форма: Квиз подбора бани
Версия квиза: v1
Ответы:
Сезонность: Круглый год
Размер: 4–4,5 м
Количество человек: 3–4
Бюджет: 400–600 тыс. ₽
Срок покупки: Через 1–3 месяца
Способ связи: Звонок
Страница: https://banivyatki.ru/
Время отправки: 08.10.2026 09:00 (МСК)
Метки: utm_source=yandex, utm_medium=cpc, utm_campaign=demo
```

Это эквивалент желаемой структуры в существующей архитектуре. ANSWERS-секция вставляется для form quiz, общие строки продолжают формироваться общим кодом. Ответы не следует пересылать в CONTACT: контекст относится к конкретному новому обращению/сделке, а не ко всем обращениям этого человека.

## 7. Checklist файлов для добавления форм

Catalog реализован по отдельному UI brief; ниже перечислены фактические изменения. Карточки обновлены: capacity4,5 м «для 4–6 чел.»,6 м «для 5–8 чел.»; единая кнопка подписи/миниатюры140×105 открывает прежний viewer с одним catalog_plan_open. Эти UI-правки не меняют payload/form/model codes/CRM/backend. Quiz остаётся проектом будущего задания.

### 7.1. Фактические файлы catalog

| Файл / область | Изменён? | Назначение |
| --- | --- | --- |
| `src/data/catalog.js` | Создан | Три модели, crmCode, картинки, тексты, priceFrom:null |
| `src/components/catalog/{CatalogSection,CatalogCard,CatalogDialog,CatalogPlan,CatalogForm}.jsx` | Созданы | Секция/CTA, viewer и отдельная форма phone/name/method/consent, состояния/защиты; выбранная модель сохраняется |
| `src/App.jsx` | Да | Только импорт/вставка после Hero |
| `src/components/Button.jsx`, `ResponsivePhoto.jsx`, `calculator/Segmented.jsx` | Нет | Переиспользованы; keyboard arrows нового method-control добавлены локально в CatalogForm |
| `src/components/calculator/LeadForm.jsx` и старые формы | Нет | Старое поведение сохранено |
| `src/lib/submitLead.js`, `phone.js`, `utm.js`, `track.js`, `callback.js` | Нет | Helpers переиспользованы; callback schedule каталог не обещает |
| `server/lib.php` | Да | BV_FORMS, BV_CATALOG_MODELS, bv_catalog_valid, catalog_model в lead, server COMMENTS |
| `public/api/lead.php` | Да | Вызов bv_catalog_valid до phone normalization/REST |
| `server/tests/handler.test.php` | Да | Все три модели, exact CRM fields, invalid input, очередь/retry и business regression |
| `server/tests/phone.test.php`, `bitrix-stub.php`, `server/retry.php` | Нет | Общие механизмы без изменения |
| `private/config.php`, образец config, Actions | Нет | Настроенные общие mapping применяются к catalog |
| `public/photos/`, `source-assets/catalog/` | Созданы assets |12 WebP в public; README pipeline в Git,6 JPG master только локально и игнорируются Git |
| Метрика | Цели вызваны в новых компонентах | catalog_open/catalog_plan_open/catalog_submit с model; счетчик не изменён. Кабинет целей отдельно проверить |

Важный порядок доставки: сначала server/lib.php → private/lib.php, потом новый public/api/lead.php/frontend. Retry/config обновлять не требуется; существующий retry должен читать новую lib.

### 7.2. Чтобы добавить form quiz

| Файл / область | Менять? | Конкретная цель будущей работы |
| --- | --- | --- |
| `src/components/QuizForm.jsx` (новый) | Да, создать | Шаги, ответы, back/next, итоговый phone/name/method/consent, validation и однократная отправка только завершённого квиза |
| `src/data/quiz.js` (новый) | Да, создать | Version и закрытые options/code-label pairs, тексты вопросов; это UI-данные, не замена server validation |
| Файл подключения quiz CTA/блока | Да | Разместить сценарий по отдельному заданию; App только для новой секции; открытие/контекст |
| Button/Segmented и существующие helpers | Нет | Переиспользовать; не дублировать submit/phone/UTM/track |
| `src/lib/submitLead.js` | **Нет** | Общий JSON helper подходит scalar quiz payload |
| `server/lib.php::BV_FORMS` | Да | quiz label «Квиз подбора бани», title «Квиз» |
| `server/lib.php::bv_build_lead` | Да | quiz_version и пять quiz_* scalar fields, ограниченные длины; сохранять только проверенный контракт |
| `server/lib.php` новые enums/version/validation | Да | Типы string, known version/options, обязательные ответы, запрет nested structures и неизвестных quiz_*; контролируемая схема |
| `public/api/lead.php` | Да | Вызвать validation новых сценариев, 400 invalid quiz до REST/queue |
| `server/lib.php::bv_deal_comments` | Да | Секции версии/ответов, стабильный порядок, labels из server enums; пустые/невалидные значения не молча терять |
| bv_deal_title/fields/contact_fields/utm_fields | Нет при базовом TITLE и COMMENTS-only ответах | Default title/BV_FORMS mapping уже подходят; новые UF-поля только при отдельном требовании CRM фильтров |
| config.sample.php и private/config.php | Нет для минимального варианта | Существующие воронка/источники/связь/UTM; новые mappings нужны лишь для отдельных quiz UF-полей |
| `server/retry.php` | Нет для минимального совместимого lead | Обновлённая lib должна понимать quiz и прежние jobs; новые поля уже в сериализованном lead |
| `src/lib/track.js`, `index.html` | Нет | Общий track/counter; analytics callbacks в новом QuizForm |
| QuizForm + Метрика | Да | `quiz_start`, при необходимости `quiz_step {step_id}`, `quiz_submit` после ok; не отправлять ответы/телефон в goal params |
| `server/tests/handler.test.php` | Да | Payload/version/enum/types/limits/COMMENTS, источники, очереди, retry и regression старых сценариев |
| `server/tests/bitrix-stub.php` | Да для расширенного failure coverage | Modes contact failure, deal failure, side effect + timeout, slow chain; не нужен новый REST-метод для quiz |
| phone.test.php, workflow, Vite | Нет | Нормализация/публикация остаются прежними; tests запускать, private lib обновлять отдельно |
| Документация | Да после реализации | Реальный version/options/поведение и тестирование |

Не отправлять промежуточные шаги квиза как отдельные сделки: это множит обращения и цели, повышает вероятность дублей. Если нужна сохранность незавершённого квиза, это отдельный сценарий хранения с явным согласием/retention, а не скрытая последовательность lead.php вызовов.

## 8. Квиз и динамические данные: контракт payload

### 8.1. Может ли текущий backend принять объект quiz_answers безопасно?

JSON-парсер декодирует вложенный объект в PHP array, но текущий bv_build_lead **полностью игнорирует quiz_answers**. В существующее строковое comment объект тоже не попадёт: bv_str вернёт пустую строку. При form quiz endpoint после antispam/rate limit вернёт 400 неизвестной формы. При form final с quiz_answers сделка создастся без ответов. Это отсутствие поддержки, не успешная безопасная обработка квиза.

Нельзя решить это копированием всего `$data` в lead или сериализацией произвольного объекта в COMMENTS: потеряются whitelist, пределы и тестируемый порядок; клиент сможет навязать лишние поля/текст.

### 8.2. Сравнение вариантов

| Вариант | Плюсы | Минусы в текущем коде | Вывод |
| --- | --- | --- | --- |
| A: `quiz_answers: {season, size, people, ...}` | Логически группирует ответы, удобно расширять с явной version | Требует отдельной recursive/структурной схемы, отличать object/list, ограничить keys/count/depth/types/length, нормализовать nested lead и queue; bv_str не подходит | Возможен при явном валидаторе, но больше новых механизмов |
| B: `quiz_season`, `quiz_size`, `quiz_people`, ... | Прямо соответствует плоскому bv_build_lead, простая whitelist/enum validation, понятные fixtures и queue | Нельзя автоматически добавлять произвольные вопросы; frontend/server options надо синхронизировать | **Рекомендован для текущего фиксированного квиза** |
| C: одна готовая строка | Можно поместить в текущий comment ≤2000, минимально для прототипа | Нет проверки полноты/enum, frontend диктует headings, ответы трудно фильтровать/переиспользовать, риск обрезания и неоднозначности; отдельный form всё равно нужен | Не рекомендован как основной контракт |

Для динамического конструктора с меняющимися вопросами A + schema version может быть лучше позднее. Для пяти известных вопросов лендинга B минимальнее и соответствует текущей PHP-архитектуре. Не создавать произвольный список «любые ответы», пока маркетинговая структура фиксированная.

### 8.3. Рекомендуемый B (проект контракта v1, не реализован)

Пример payload итогового шага; значения вариантов предварительные и требуют согласования маркетингового ТЗ:

```json
{
  "form": "quiz",
  "quiz_version": "v1",
  "quiz_season": "year",
  "quiz_size": "4_5m",
  "quiz_people": "3_4",
  "quiz_budget": "400_600k",
  "quiz_purchase_term": "1_3months",
  "phone": "+70000000000",
  "name": "Тест",
  "contact_method": "call",
  "utm_source": "yandex",
  "utm_medium": "cpc",
  "utm_campaign": "demo",
  "utm_content": "",
  "utm_term": "",
  "page_url": "https://banivyatki.ru/",
  "submitted_at": "2026-10-08T06:00:00.000Z",
  "elapsed_ms": 12000,
  "website": ""
}
```

Referrer не надо дублировать в React: его добавит submitLead. Timer разумно считать от открытия/начала квиза и не сбрасывать при переходе на последний шаг, иначе быстро заполненный последний экран даст ложный dropped после долгого прохождения.

Предлагаемые server правила:

| Ключ | Тип, предел | Предлагаемые значения |
| --- | --- | --- |
| quiz_version | string ≤20, обязательный | `v1`; неизвестная version отклоняется |
| quiz_season | string ≤20, обязательный | warm / year / unsure |
| quiz_size | string ≤20, обязательный | 3m / 4_5m / 6m / unsure |
| quiz_people | string ≤20, обязательный | 1_2 / 3_4 / 5_6 / 7_plus / unsure |
| quiz_budget | string ≤20, обязательный | up_to_300k / 300_400k / 400_600k / 600k_plus / unsure |
| quiz_purchase_term | string ≤20, обязательный | soon / 1_3months / 3_6months / later / unsure |

Отвечать «не определился» можно через enum unsure; отсутствие поля не следует считать эквивалентом unsure. Проверять raw type/длину/enum **до** общей coercion/truncation, чтобы массивы/числа/длинный код не стали silently empty либо совпавшим укороченным кодом. Неизвестные `quiz_*`/quiz_answers в quiz payload отклонять, остальные общие metadata принимать по явному контракту. Не менять глобальное правило неизвестных полей старых форм незаметно.

Лейблы для COMMENTS задаёт backend, не клиент. Ответы хранятся в нормализованной lead и queue без потери; CONTACT остаётся общим. Версия нужна, чтобы обновление формулировок/options не переосмыслило ожидающие retry ответы: сохранять понимание v1, пока возможны jobs v1. При новой v2 добавлять отдельную схему, не заменять labels кодов задним числом. Бюджетный диапазон — ответ пользователя, **не OPPORTUNITY/price_shown**.

Если ответы нужны для сегментации в CRM, позже добавить специально настроенные UF mapping для этих нормализованных scalar полей. Произвольные UF_CRM keys, поле назначения либо labels из клиентского JSON принимать нельзя.

## 9. Минимальный контракт «Получить каталог»

Сценарий: CTA → форма → принятая заявка → новая сделка с понятным типом → менеджер связывается выбранным способом и отправляет каталог. Автоматическая отправка PDF/email/MAX не входит в текущую интеграцию и не нужна для этого минимального варианта.

### 9.1. Фактические поля и payload

- `form: catalog` обязателен и определяет запрос server-side.
- `catalog_model` обязателен: raw string `podkova-35`, `podkova-45` или `podkova-60`; доверенная подпись определяется BV_CATALOG_MODELS.
- Телефон обязателен, имя необязательно, contact_method call/max обязателен в новом server контракте.
- Согласие обязательно UI, как в существующих формах. Сейчас оно не передаётся/не хранится; если требуется журнал согласия, это отдельное расширение общего контракта и политики, не «уже имеющаяся» функция.
- Стандартные UTM/page/submitted_at/elapsed_ms/website; referrer добавляет helper.
- Email, файл каталога, catalog URL, COMPANY_ID, произвольное request_text и CRM source IDs для минимального сценария не нужны.

```json
{
  "form": "catalog",
  "catalog_model": "podkova-45",
  "phone": "+70000000000",
  "name": "Тест",
  "contact_method": "max",
  "utm_source": "yandex",
  "utm_medium": "cpc",
  "utm_campaign": "demo",
  "utm_content": "",
  "utm_term": "",
  "page_url": "https://banivyatki.ru/",
  "submitted_at": "2026-10-08T06:00:00.000Z",
  "elapsed_ms": 8000,
  "website": ""
}
```

### 9.2. CRM, COMMENTS, analytics

BV_FORMS catalog: label «Каталог бань», title «Каталог». SOURCE_DESCRIPTION → этот label, TITLE → «Сайт · Каталог», SOURCE_ID → прежнее правило канала. COMMENTS → пример раздела 6.3, строка «Запрос: Отправить каталог бань» формируется только сервером. CONTACT/воронка/ответственный/UTM/способ связи — общий mapping.

Analytics: `catalog_submit` после ok, `catalog_open` при открытии формы и `catalog_plan_open` при открытии планировки; все три с `{model}`; не считать open/submit-click конверсией принятой заявки. Цель submit может означать queue acceptance. Не отправлять name/phone/COMMENTS в Метрику.

Реализованы новый UI, BV_FORMS, validation и её вызов в endpoint, catalog_model в whitelist, серверные COMMENTS и tests. **submitLead не изменён**, новая CRM source category не нужна. При будущих нескольких каталогах добавлять только известный `catalog_id`/version с enum и соответствующим серверным описанием; не принимать URL для скачивания/отправки из browser без allowlist.

## 10. Тестирование

### 10.1. Что уже покрыто тестами репозитория

`server/tests/phone.test.php`: 22 cases нормализации string/int, форматов 7/8/10 цифр, коротких/длинных/иностранных/нечисловых input, null/array/bool. Особое правило: неполный номер с кодом, в котором всего 10 цифр, рассматривается как десятизначный локальный и получает новый +7; это явно зафиксировано тестом, не полноценная проверка реального номера.

`server/tests/handler.test.php` с `server/tests/bitrix-stub.php`:

- GET 405, чужой Origin 403, malformed JSON 400, www/no Origin допустимы.
- Honeypot/too fast/missing elapsed → ok без REST.
- Пустой phone/form, неизвестный form, неверный телефон.
- Обычный успех: findbycomm/contact.add/deal.add, телефон +7, поля контакта, расчётный TITLE, воронка/стадия/источник/связь/UTM и точный COMMENTS; отсутствие OPPORTUNITY.
- Visit showroom/MAX и источник сайта; FAQ вопрос/fallback имени; final label/title; calc alias без цены.
- Found contact → только find + deal, CONTACT_ID найденного и строка повторного обращения.
- Общая CRM ошибка и timeout **на первом find** → queue и ok; attempts=1, нормализованный телефон.
- Retry HTTP 404; CLI отправляет jobs и очищает queue; 10-я ошибка → failed; второй retry выходит по lock.
- 6-й запрос IP →429; очистка старых log; отсутствующий/неполный/синтаксически неверный config и отсутствующая lib.

Stub modes сейчас `ok`, `found`, `error`, `timeout`; error/timeout действуют для любого первого вызова, поэтому не моделируют отдельно «contact создан, затем deal упал». Добавлен явный regression happy path business и catalog cases. Нет полного покрытия strict enum/длинных текстов/oversized body/nested answers/непишущейся очереди/реального browser timeout/случая неопределённого результата deal.add. Локальные PHP-тесты не проверяют React/счётчик/live portal/серверный cron. Handler расширен и запущен на PHP8.3:83 проверки пройдены, phone22 случая пройдены.

Команды выполненной проверки: `php server/tests/phone.test.php`, `php server/tests/handler.test.php`. Handler использует временную копию сайта и локальные PHP-серверы на 8090/8091/8092, требует cURL/mbstring/CLI/proc_open и свободные порты. Не подставлять production webhook в stub tests.

### 10.2. Расширенное покрытие и оставшиеся рекомендации

| Область | Cases и ожидаемый результат |
| --- | --- |
| Catalog happy path | form catalog + общие поля → CONTACT/DEAL, точные TITLE/SOURCE_DESCRIPTION/COMMENTS, call и max, источник сайта/Директа, все 5 UTM |
| Catalog validation | Нет/invalid phone →400; отсутствующий/неизвестный method в новом контракте →400; лишний request_text не управляет server строкой; optional name пустой → fallback |
| Quiz happy path | Все пять вариантов + version → exact ordered COMMENTS и сохранение всех ответов; unsure явно отображается; бюджет не превращается в OPPORTUNITY |
| Quiz schema | Missing answer/version, unknown version/enum, numbers/bools/null/array вместо strings, quiz_answers object/list вместо B, unknown quiz_* →400, ноль REST/queue |
| Unknown form | quiz (не поддерживается) и random/case/whitespace →400 при elapsed≥3000; отдельно подтвердить нынешний early dropped при elapsed отсутствует, чтобы не ошибиться в oracle |
| Длины и типы | Границы и превышения каждого нового enum field; старые name/question/comment/UTM обрезаются по прежнему правилу; control chars и newlines; body>65 536 →400; nested/deep structures не проходят новый schema |
| Источник | YANDEX/CPC →Direct; другой medium/source либо пустой source_direct →site; никакой form не меняет channel; labels catalog/quiz distinct от final |
| CONTACT | Existing contact не создаётся/не обновляется; новые ответы остаются в DEAL; несколько найденных IDs →first; пустой/невалидный REST contact ID →queue |
| CRM failure по этапам | Расширить stub: find failure, contact.add failure, deal.add failure после contact; queue ok и сохранённый contact_id там, где он уже известен |
| Queue/retry | Catalog и quiz serialise/read без потери, exact responses после retry, не повторять contact.add при сохранённом ID; found-флаг/повторная строка сохраняются |
| Failed/совместимость | 10 attempts, malformed job, старые jobs после новой lib, v1 после появления v2; повреждённые jobs не должны незаметно создавать неполные сделки |
| Хранение/сбои | Queue dir not writable →500, не ok; ошибки rewrite/unlink/rename retry должны быть видимыми; параллельные retry/порядок/lock; отсутствие cron отдельным operational check |
| Неопределённый outcome | Stub создаёт side effect deal, но теряет/задерживает ответ; задокументировать существующий риск дубля, не ожидать дедупликацию без её реализации |
| Timeout frontend | Медленные успешные find+contact+deal суммарно>15 с →browser error при потенциально созданной сделке; проверяется frontend/integration harness, PHP suite сам это не моделирует |
| Логи / PII | Подставить synthetic sentinel в name/phone/question/answers/URL; private operational log и HTTP/error response не содержат sentinel/credentials; queue содержит lead и остаётся private |
| Frontend/analytics | Стрелки шагов не отправляют POST; итог один submit; sending/error/done; goal только после ok, без PII; local antispam без POST/goal; elapsed от начала quiz |
| Regression | Все пять старых canonical scenarios + alias, бизнес добавлен явно; старые fields/title/comments/source/UTM не меняются побочно |

Имеющийся REST stub пишет **полный request body** в локальный calls.log тестовой папки. Это допустимо лишь с синтетическими fixtures; не использовать реальные заявки, не публиковать файл/CI-артефакт с клиентскими данными. Тестовые детали failure также могут печатать payload, поэтому fixtures должны оставаться вымышленными.

## 11. Архитектурные риски новых форм

| Риск | Что подтверждает код | Последствие / правило будущей разработки |
| --- | --- | --- |
| Дубли сделок | Каждый bv_send_lead вызывает deal.add; поиска/уникального ключа сделки нет | Двойное нажатие/повтор пользователя/потерянный ответ могут создать несколько DEAL; contact dedup не решает это |
| Отсутствие idempotency | Нет request_id, storage результата, unique lock per request | Не добавлять автоматический frontend retry. Если нужен exactly-once intent, отдельно проектировать стабильный ID на одну попытку пользователя и server дедупликацию/REST reconciliation; просто добавить поле в COMMENTS недостаточно |
| Browser timeout | 15 с browser, до 10 с на каждый из 2–3 REST calls | Browser может показывать error после создания contact/deal; повтор создаст ещё сделку. Abort fetch не гарантирует отмену PHP/REST |
| Неопределённый REST outcome | Ошибка/timeout deal.add может произойти после side effect | Queue retry добавит сделку повторно; текущий код не проверяет факт создания после потери ответа |
| Контакт тоже может дублироваться | find/add не атомарны; ответ contact.add может потеряться | Сохранённый contact_id помогает после подтверждённого результата, но нет transaction/locking для параллельных заявок |
| Success не равен CRM success | 200 для queued, также dropped antispam | Manager должен мониторить queue/failed; цель Метрики — acceptance. Новая форма не должна обещать автоматическую доставку каталога |
| Cron/failed | Retry отдельно CLI; нет auto-обработки failed/alert | Без cron заявки останутся; после 10 failures попадут в failed, менеджер может их не увидеть. Нет гарантированного срока доставки |
| Потеря новых полей | bv_build_lead whitelist; non-string arrays →empty | Новый UI без backend согласования потеряет ответы даже при ok; tests обязаны проверять payload→COMMENTS и queue |
| Несовпадение деплоя | Workflow не доставляет private lib | Frontend catalog/quiz с прежним backend →400; новый endpoint с отсутствующей helper function →500. Нужна совместимая последовательность server/frontend updates |
| Эволюция очереди | Retry не повторяет полную validation; formatter использует текущий код/config | Удаление form/enum/version ломает старые jobs; смена labels/mapping может изменить CRM результат ожидающих jobs. Хранить совместимость |
| Ошибки записи queue | Initial write проверяется, но retry rewrite/unlink/rename результаты не всегда учитывает | Job может остаться после sent и быть отправлен снова; attempts не сохраниться. Нет atomic rename всего обновляемого JSON, возможна повреждённая job после сбоя |
| Объём очереди | Retry перебирает весь glob; нет per-run batch limit/backoff | При массовом quiz трафике cron может работать долго; следующая задача выходит по lock. Нет внешнего мониторинга/лимита хранения |
| Ошибка источника | Direct только по yandex+cpc; UTM client-side; session set overwrites | Другой naming medium/потеря меток →site; это не доказательство attribution. Не использовать SOURCE_ID как form type |
| Неизвестные enum/поля | Legacy contact_method/visit_type не reject; whitelist общий | Способ связи может отсутствовать в CRM; поля могут попасть в COMMENTS другой формы. Новые сценарии нуждаются в strict schema |
| Цена и бюджет | price_shown клиентский, OPPORTUNITY отсутствует | Не считать ответы бюджета/показанную цену фактической суммой сделки |
| Согласие/PII | UI consent не сохраняется; queue содержит полный lead | Не заявлять о server-журнале согласия; private queue/failed нужны права/retention по отдельной задаче |
| Персональные данные в логах | bv_log общий string logger; call sites сейчас пишут metadata/hash, не payload | Если новый разработчик добавит json_encode(lead) в log, защиты в самом logger нет. Не логировать answers/COMMENTS/URLs/phone/name |
| Публичная отладка | submitLead console payload только DEV; stub пишет request bodies; tests print details | Не включать debug payload в production, не коммитить реальные captures, не выкладывать private/log/queue в public |
| Hash не анонимизация | Phone hash SHA-256 truncated 10 без salt | Позволяет корреляцию и потенциальный перебор; не публиковать журналы лишь потому, что вместо номера hash |
| Подделываемый antispam | elapsed/website из клиента, Origin может отсутствовать | Не CAPTCHA/auth; быстрый последний шаг quiz может попасть под dropped; новые CTA повышают нагрузку/rate limit общего IP |
| Конфиг и права CRM | cfg проверяет presence, не field types/permissions | Unknown REST field/enum может отправлять все заявки в queue. Не менять source/stage/method mapping без портальной проверки |
| Разрыв аналитики | Нет request ID связи goal↔DEAL; track может skip ym | Наличие deal не гарантирует goal и наоборот; no PII в event params. Exact CTA attribution требует отдельного контракта |
| Многошаговая отправка | Нет серверной сущности draft/session quiz | Отправка на каждом шаге создаст новые сделки; итоговое обращение отправлять один раз, progress goals отдельно |

Текущие ошибки HTTP не раскрывают REST body/вебхук; `bv_bitrix_call` возвращает короткий очищенный error code. PHP operational call sites логируют form/result/ID/attempts/hash; PII хранится именно в private queue/CRM. Новая форма должна сохранить это разделение. Private файлы и журналы нельзя скачивать в публичные deploy artifacts.

## 12. Итоговая инструкция: как правильно добавить новый маркетинговый сценарий с формой на banivyatki.ru

1. Утвердить назначение сценария, место CTA, обязательные поля и success-текст; определить, одна ли это итоговая заявка.
2. Выбрать уникальный canonical form и label BV_FORMS, отличные от имеющихся; сохранить SOURCE_ID для канала рекламы.
3. Зафиксировать payload schema, типы, limits, enum и version квиза; не принимать CRM fields/labels/URL доставки произвольно от клиента.
4. Сделать UI на существующих Button/Segmented/helpers, с phone/consent/honeypot/time/sending/error/success; квиз отправлять после последнего шага.
5. Использовать неизменный submitLead и общие UTM/referrer; не обращаться к REST Битрикс24 напрямую из браузера.
6. Добавить form в BV_FORMS и только необходимые новые поля в bv_build_lead.
7. Ввести server validation нового сценария и вызов в endpoint до REST/queue; не менять старые контракты побочно.
8. Сформировать TITLE/SOURCE_DESCRIPTION и структурированный COMMENTS на сервере; ответы преобразовать в доверенные labels.
9. Проверить общий CONTACT/DEAL/UTM/method mapping; менять private config только при отдельной потребности новых CRM-полей/маршрутизации.
10. Обеспечить сохранение новых fields в queue и совместимость formatter/retry со старыми jobs/version; учесть риск duplicates/timeouts отдельно.
11. Добавить success goal в новую форму, progress goals при необходимости; настроить Метрику без передачи PII.
12. Расширить backend tests success/validation/source/queue/retry/failure, прогнать существующие PHP-тесты и frontend build/UX checks.
13. Подготовить review изменений и совместимый план доставки: обновлённая private lib/retry отдельно, затем связанный endpoint/frontend; workflow сам private не обновит.
14. После разрешённой публикации проверить синтетическую заявку в CRM, SOURCE_DESCRIPTION/COMMENTS/UTM/контакт, цели, очередь и cron, без раскрытия config.
15. Обновить техническую документацию по реализованному контракту и зафиксировать обнаруженные внешние ограничения.

Эти шаги — инструкция для следующего маркетингового сценария. Catalog реализован в ветке feature/catalog-models; quiz не реализован. Production deploy/merge этой работой не выполнялись. Приватный config, старые компоненты, workflow, retry и счётчик не изменены.

## 13. Проверки catalog и ограничения релиза

PHP8.3: phone.test.php22 случая; handler.test.php83 проверки успешно. Catalog: три модели, точные TITLE/SOURCE_DESCRIPTION/COMMENTS, source site/Direct, call/MAX, raw invalid типы/enum/длины/пропуски, отсутствие непредусмотренных CRM fields, queue при failure и retry каждой модели. Старые сценарии и business regression проходят. Рекомендации раздел10 для catalog happy path/enum/queue уже реализованы; quiz, потерянный REST outcome и дополнительные сбои остаются будущими проверками.

DOM harness:35 проверок карточек/null цены, plan→form, модели, validation, sending guard, error/retained input, retry, success goal без PII, закрытия/scroll/focus restore. Native dialog полифиллен: actual focus trap и реальный Escape проверяются отдельно браузером. npm build прошёл. Browser visual QA на1440/1024/768/600/390/360 и CLS не выполнены из-за среды. Перед production нужны visual QA, доставка private lib, настройка целей и синтетическая проверка CRM/queue. Отчёт: docs/CATALOG_IMPLEMENTATION.md.
