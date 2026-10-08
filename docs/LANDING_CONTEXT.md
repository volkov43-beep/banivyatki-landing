# Технический контекст лендинга «Бани Вятки»

Дата инвентаризации: **8 октября 2026 года**. Репозиторий: `volkov43-beep/banivyatki-landing`. Базовая версия: `bdca6c33b3d9051ec2ae78d32e8721f00ec56005`; документ обновлён по реализации ветки `feature/catalog-models` (каталог добавлен, production не проверен и не опубликован этой работой).

Документ описывает **существующую реализацию в репозитории**, а не предполагаемые будущие изменения. Проверка действующего сайта, кабинетов Beget, Битрикс24, Метрики, секретов GitHub Actions и задания cron в эту инвентаризацию не входит. Рабочие значения серверного конфига вне репозитория не установлены. Значения ключей, вебхуков, паролей и других credentials здесь намеренно не приводятся.

Источник истины для состава страницы — `src/App.jsx`, для оформления — JSX, `src/styles/tokens.css`, `src/index.css` и `tailwind.config.js`. `README.md`, `CLAUDE.md` и комментарии содержат исторические описания: например, упоминание форм-заглушек уже не соответствует действующему `submitLead`, а комментарий у `SectionProcess` называет фон светлым, хотя JSX использует `bg-forest`. Такие описания не следует принимать за фактическое состояние без сверки с кодом.

## 1. Общая архитектура

### 1.1. Стек и зависимости

| Слой | Реализация |
| --- | --- |
| UI | React `^19.1.0`, React DOM `^19.1.0`; функциональные компоненты, hooks, JavaScript/JSX |
| Сборка | Vite `^7.1.0`, `@vitejs/plugin-react ^5.0.0` |
| Стили | Tailwind CSS `^3.4.17`, PostCSS `^8.5.6`, Autoprefixer `^10.4.21`, CSS custom properties |
| Сервер заявок | PHP, целевое окружение в документации проекта — PHP 8.3; без Composer и PHP-фреймворка |
| Внешние сервисы | REST Битрикс24, Яндекс.Метрика, JavaScript API Яндекс Карт v3, Google Fonts |
| Автоматическая публикация | GitHub Actions → сборка Node.js 22 → FTPS на Beget |

Это клиентский лендинг с отдельной HTML-страницей политики конфиденциальности. Next.js, серверного рендера React, React Router, TypeScript, CMS, Redux, базы данных и библиотеки UI-компонентов в текущей реализации нет. Наличие `ssr: true` в настройке Метрики не означает, что сайт использует SSR.

`package.json` использует ESM (`type: module`). Точные установочные версии фиксирует `package-lock.json`. Только `react` и `react-dom` являются runtime npm-зависимостями; карты подгружаются внешним скриптом, а не npm-пакетом.

### 1.2. Структура и точки входа

```text
index.html                       HTML лендинга, SEO, шрифт, Метрика, preload hero
privacy/index.html               HTML отдельной страницы /privacy/
src/main.jsx                     запуск лендинга, UTM, обработчик кликов по телефону
src/App.jsx                      Header, порядок секций main, Footer
src/privacy.jsx                  запуск страницы политики
src/pages/PrivacyPage.jsx        текст и оформление политики
src/components/                  секции и общие компоненты
src/components/catalog/          секция, карточка модели, dialog, планировка, форма
source-assets/catalog/           локальные master JPG вне Git/public/dist
src/components/calculator/       карточки, планировки, переключатели, общая LeadForm
src/components/works/            карточки объектов, просмотр фото, карта
src/components/reviews/          отзывы владельцев, аватар, просмотр фото
src/components/showroom/         карточки просмотра и форма записи
src/components/diagrams/         SVG-примитивы и аннотированные схемы
src/components/comparison/       вспомогательная разметка сравнительного блока
src/components/benefits/         SVG-иконки преимуществ
src/data/                        контент, варианты расчёта, отзывы, объекты, FAQ
src/lib/                         отправка, телефон, UTM, аналитика, карты, события, время ответа
src/styles/tokens.css             визуальные CSS-токены
src/index.css                    Tailwind, базовые правила, анимация CTA, SVG и карта
public/photos/                   изображения, копируемые в сборку без обработки
public/api/lead.php              публичный PHP endpoint
public/.htaccess                 правила Apache, redirect www, MIME, gzip, cache
server/                          приватная PHP-логика и образец конфигурации
server/tests/                    PHP-тесты и заглушка Битрикс24
scripts/geocode.mjs              вспомогательное уточнение координат; изменяет objects.js
.github/workflows/               публикация Beget и старого redirect на GitHub Pages
pages-redirect/index.html        redirect со старого адреса GitHub Pages
```

Лендинг: `index.html` → `/src/main.jsx` → `createRoot(#root)` внутри `StrictMode` → `App`. До рендера вызываются `captureUtm()` и `trackPhoneClicks()`. Главный документ сначала содержит контейнер React; содержимое секций появляется после исполнения JavaScript.

Политика: `privacy/index.html` → `src/privacy.jsx` → `PrivacyPage`; используется тот же CSS и `Footer`. Это отдельная точка сборки, а не маршрут SPA. Контент и реквизиты оператора заданы прямо в `src/pages/PrivacyPage.jsx`.

Состояние хранится локально в React-компонентах. Связь между независимыми секциями организована через события `bv:calc` и `bv:visit` с функциями подписки/отписки из `src/lib/calc.js` и `src/lib/visit.js`. Серверных контентных запросов для заполнения лендинга нет.

### 1.3. Сборка, проверки, публикация

Команды: `npm ci`, `npm run dev`, `npm run build`, `npm run preview`. Vite собирает два HTML-входа (`main`, `privacy`); `base: '/'`. Выход — `dist/`, JS/CSS с хешами — `dist/assets/`, файлы `public/` копируются напрямую. Содержимое `server/` автоматически в `dist/` **не попадает**.

`npm run dev` и `npm run preview` не исполняют PHP. Настоящая отправка формы требует PHP-окружения; встроенной успешной заглушки отправки в dev сейчас нет. Отдельных npm-команд lint/test и настроенного frontend test runner нет. PHP-тесты запускаются вручную: `php server/tests/phone.test.php` и `php server/tests/handler.test.php`. Второй тест создаёт временную структуру хостинга, поднимает локальные PHP-серверы и REST-заглушку; проверяет валидацию, поля CRM, очередь, retry, лимиты и ошибки конфигурации. Это тесты, присутствующие в коде; их прохождение на текущем окружении в рамках документационной инвентаризации не утверждается.

`.github/workflows/deploy-beget.yml` запускается при push в `main` либо вручную. Последовательность: checkout → Node.js 22 → `npm ci` → `npm run build` с `VITE_YMAPS_KEY` → проверка `dist/index.html`, `dist/privacy/index.html`, `dist/.htaccess` и отсутствия старого базового пути → `SamKirkland/FTP-Deploy-Action@v4.3.5` по FTPS. Источник `./dist/`, назначение `./`: FTP-аккаунт предполагается привязанным к корню `public_html`. Имена GitHub Actions secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `VITE_YMAPS_KEY`. Полная очистка отключена (`dangerous-clean-slate: false`), синхронизация учитывает ранее опубликованные файлы через файл состояния FTP action. Публикации сериализованы (`concurrency: beget`, без отмены выполняющейся задачи).

Приватные `server/lib.php`, `server/retry.php` и заполненный `config.php` нужно отдельно размещать на сервере в соседней с `public_html` папке `private/`. Автоматизации доставки этой папки и установки cron в workflow нет. Следовательно, изменение backend в GitHub само по себе не обновляет приватные PHP-файлы на Beget.

`.github/workflows/pages-redirect.yml` публикует redirect старого GitHub Pages, а не рабочую копию лендинга. `pages-redirect/index.html` использует canonical/noindex, meta refresh и JavaScript redirect на основной домен.

`public/.htaccess`: запрещает листинг, перенаправляет `www` на HTTPS без `www`, включает MIME WebP/шрифтов и gzip. HTTPS для запросов без `www` предполагается настроенным на хостинге. HTML — `no-cache`; фото, favicon и OG — 7 дней; шрифты — год; `/assets/` — год с `immutable`. `public/robots.txt` закрывает `/privacy/` и указывает домен; sitemap в репозитории отсутствует. Canonical/OG/Twitter metadata главной страницы находятся в `index.html`, OG-картинка — `public/og-banivyatki.jpg`.

## 2. Главная страница: фактический порядок блоков

Порядок ниже строго соответствует `src/App.jsx`. **Каталог — второй раздел main сразу после Hero, «Наши работы» — третий; остальные секции сохраняют прежний порядок.** Карта является вложенной частью «Наших работ». Header наложен поверх hero; Footer стоит после main.

### 2.1. Header — контакты поверх первого экрана

- **Компонент/файл:** `Header`, `src/components/Header.jsx`.
- **Содержимое и дочерние элементы:** логотип и телефон; inline SVG телефонной трубки. Навигационного меню и hamburger нет.
- **Assets:** `public/photos/logo-128.webp`, `logo-256.webp`, `srcset`; отображение 48 px на малых экранах, 64 px на desktop.
- **Текст:** телефон берётся из `PHONE` в `src/data/calculator.js`; остальное — JSX.
- **CTA/ссылки:** логотип → `#top`, телефон → `tel:+78332775770`, цель `phone_click` через общий обработчик.
- **Формы:** отсутствуют. Header абсолютный, не sticky/fixed.

### 2.2. Первый экран — Баня-Подкова

- **Компонент/файл:** `SectionHero`, `src/components/SectionHero.jsx`, якорь `#top`.
- **Назначение:** основное предложение «Баня-Подкова: шире бочки, с ровным полом, под ключ», стартовая цена, факты и рейтинг Авито.
- **Дочерние компоненты:** `Button`, `RatingStars`; `RatingBadge` — локальная функция внутри файла, не общий экспортируемый компонент.
- **Assets:** `hero-autumn-1280.webp`, `hero-autumn-1920.webp`, `hero-autumn-mobile-1080.webp`; `<picture>` переключает мобильный кадр до 1023 px. CSS зеркалит изображение по горизонтали. Hero загружается приоритетно, preload и выбор кадра согласованы с `index.html`.
- **Текст:** заголовок, подзаголовок, факты — в JSX/локальных константах; цена — `MIN_PRICE` из `src/data/calculator.js`; рейтинг/число оценок — `SOURCES.avito` из `src/data/reviews.js`.
- **CTA/ссылки:** «Рассчитать стоимость» → `#calculator`. Плашка рейтинга не является внешней ссылкой. Отдельной цели клика hero CTA сейчас нет.
- **Формы:** отсутствуют; квиз/модальная форма первого экрана не реализованы.
- **Оформление:** `ink`, светлый текст, золотая цена; desktop текст слева, фото справа с градиентом и ореолом; mobile фото сверху, текст ниже. Однократное «дыхание» CTA запускается по видимости, без изменения геометрии.

### 2.3. Каталог моделей «Подкова»

- **Компонент/файл:** `catalog/CatalogSection`, `src/components/catalog/CatalogSection.jsx`, `#catalog`, H2 с `aria-labelledby`.
- **Структура:** `CatalogSection` → три `CatalogCard`; общий `CatalogDialog` показывает либо `CatalogPlan`, либо специализированную `CatalogForm`. Dialog использует native `<dialog>` через portal, `showModal`, Escape, кнопку закрытия, блокировку scroll и возврат focus. При переходе план → форма сохраняет выбранную модель и исходную кнопку.
- **Текст:** `src/data/catalog.js`: заголовок «Выберите свою «Подкову»», подзаголовок, модели `podkova-35/45/60`, названия, офферы, размеры, число секций, вместимость, `priceFrom`, имена фото/планировок, alt. Все `priceFrom: null`: цены не отображаются. При заполнении чисел JSX уже выводит «от … ₽» цветом accent.
- **Assets:** `podkova-{35,45,60}-{catalog,plan}-{640,1280}.webp` в `public/photos/`; мастера — `source-assets/catalog/`. Фото через существующий `ResponsivePhoto`, одинаковое исходное соотношение 2048/1529, lazy, srcset/sizes, width/height, без crop композиции. Планировка — `<img>` с srcset, object-contain, ограничением 65dvh.
- **CTA/ссылки:** «Планировка» — Button link → modal; «Получить каталог» — Button primary → форма конкретной модели. CTA есть также внутри планировки. В форме ссылка на `/privacy/` и fallback `tel:` при ошибке. Скачивания PDF нет.
- **Форма:** телефон обязателен, имя необязательно, звонок/MAX, обязательное UI-согласие; `form: catalog`, `catalog_model` и общие metadata. Успех: «Заявка принята. Менеджер свяжется с вами и отправит каталог.»
- **Оформление/responsive:** forest, surface / muted-on-dark, существующие Onest/tokens/container/section padding. Открытые flex-column карточки без рамок/теней; нижняя группа `mt-auto`, без фиксированной высоты текста. 1 колонка <600 px, 2 от600, 3 от1024; gaps 16/24 px horizontal и32/40 vertical. Dialog max-width960 для плана,560 для формы, viewport padding16 px и scroll. Новых анимаций нет.
- **Аналитика:** `catalog_plan_open`, `catalog_open`, `catalog_submit`; только `{model}` без PII; submit после `ok:true`. Общие helpers и старые формы не изменены.

### 2.4. Наши работы — шесть объектов и карта

- **Компонент/файл:** `SectionWorks`, `src/components/SectionWorks.jsx`, `#works`; карта внутри имеет `#map`.
- **Дочерние компоненты:** `works/WorkCard`, `works/Lightbox`, `works/MapBlock`, `Button`; фотографии карточек через `ResponsivePhoto`.
- **Текст/данные:** `src/data/works.js` — название, подзаголовок, объекты, комплектации, фактические цены и примечание. Объекты: Зониха, Дороничи, Слободской, Кирово-Чепецк, Бабичи, доставка/установка. В примечании нижняя граница цены берётся из `MIN_PRICE`. Карта читает отдельный `src/data/objects.js` (не массив карточек работ).
- **Assets:** пары `obekt-1-zoniha-*`, `obekt-2-doronichi-*`, `obekt-3-slobodskoy-*`, `obekt-4-chepetsk-*`, `obekt-5-babichi-*`, `obekt-6-ustanovka-*` с ширинами 640/1280; у каждого объекта главное и дополнительное фото. Lightbox показывает галерею объекта.
- **CTA/ссылки:** фото → viewer и `works_photo_open {name}`; «+ ещё N» раскрывает комплектацию; «Рассчитать такую» → `works_calc_click {name}`, `requestCalc(season, cardId)`, выбор соответствующего варианта в калькуляторе и прокрутка к его карточкам. У доставки/установки нет цены, комплектации и кнопки расчёта.
- **Карта:** «Где стоят наши бани», региональные точки, переключение на всю область и дальние объекты. При отсутствии карты CTA «Рассчитать доставку» вызывает общий переход к калькулятору. Внешний API и fallback описаны в разделе 6.
- **Формы:** отсутствуют. Фон карточек — `surface-2`; следующая внутренняя часть карты — `ink`, без промежуточного зазора.

### 2.5. Отзывы владельцев

- **Компонент/файл:** `SectionReviews`, `src/components/SectionReviews.jsx`, `#reviews`.
- **Дочерние компоненты:** `reviews/OwnerReviewCard`, `reviews/Avatar`, `reviews/PhotoViewer`, `RatingStars`, `SourceIcon`, `Button`.
- **Текст:** `src/data/reviews.js`: `REVIEWS`, `SOURCES`, заголовок «Что говорят владельцы бань», подзаголовок про Яндекс Карты и Авито. Сейчас 10 отзывов, сначала видны 6.
- **Assets:** `otzyv-NN-foto-N-320.webp` и `-full.webp`, иконки источников `review-avito-*`, `review-yandex-maps-*`; аватар — инициалы, не отдельное фото.
- **CTA/ссылки:** раскрытие длинного текста; открытие фото; «Показать ещё»/свернуть список. Цели: `review_expand {label}`, `review_photo_open {label}`, `reviews_show_more`. Подписи источников сами по себе не ведут на внешние страницы отзывов.
- **Формы:** отсутствуют. Светлый фон `surface-2`, карточки `surface` с акцентной полосой слева.

### 2.6. Калькулятор — «Сколько стоит»

- **Компонент/файл:** `SectionCalculator`, `src/components/SectionCalculator.jsx`, `#calculator`.
- **Дочерние компоненты:** `calculator/Segmented`, `CalculatorCard`, `FloorPlan`, `LeadForm`, `ReviewCard` (отзыв бизнеса), `Button`.
- **Текст/данные:** `src/data/calculator.js` — режимы «Себе»/«Для бизнеса», сезоны, три карточки каждого сезона, комплектации, цены, телефон; часть пояснений и управляющих текстов задана в JSX. Бизнес-отзыв — `BUSINESS_REVIEW` из `src/data/reviews.js`.
- **Цены:** тёплый сезон — 293 000 / 330 000 / 374 000 ₽; круглый год — 333 000 / 363 000 / 515 000 ₽. Это отображаемые стартовые цены, не индивидуальный расчёт CRM. `MIN_PRICE` вычисляется из данных, сейчас 293 000 ₽.
- **Assets:** тёплые варианты `size-3m.webp`, `size-4-5m.webp`, `size-6m.webp`; зимние `kalkulyator-zima-{3m,45m,6m}-{640,1280}.webp`. Планировки генерируются inline SVG компонентом `FloorPlan`. Иконки площадок бизнес-отзыва — через `SourceIcon`.
- **CTA/ссылки:** выбор сезона/карточки; после выбора — переход к встроенной форме; бизнес-кнопка «Обсудить проект». Внешние события расчёта принимаются через `onCalcRequest`. Цели: `business_tab_open`, `calc_season_change {season}`, `calc_card_select {card_id}`.
- **Формы:** одна `LeadForm` в режиме `calculator` после выбора карточки и другая в режиме `business`. Цели успешной отправки — `calc_submit`, `business_submit`. Поля и endpoint см. раздел 6.
- **Mobile CTA:** нижняя фиксированная панель появляется при выбранной карточке, если форма не видна, ещё не отправлена и выбран режим «Себе»; возвращает к форме. Может оставаться видимой после прокрутки за пределы калькулятора.

### 2.7. Преимущества — «Что вы получаете»

- **Компонент/файл:** `SectionBenefits`, `src/components/SectionBenefits.jsx`, `#benefits`.
- **Дочерние компоненты:** `BenefitIcon` из `components/benefits/BenefitIcons.jsx`, `Button`.
- **Текст:** четыре преимущества из `src/data/benefits.js`; управляющие тексты — JSX.
- **Assets:** inline SVG-иконки (инструмент, часы, ширина, пар); внешних изображений нет.
- **CTA/ссылки:** «Собрать свою баню» → `benefits_cta` → `requestCalcOpen()`.
- **Формы:** отсутствуют. Фон `forest`, свободные колонки без универсальных карточек с тенями.

### 2.8. Сравнение с баней-бочкой

- **Компонент/файл:** `SectionComparison`, `src/components/SectionComparison.jsx`. У section нет собственного `id`; есть `aria-labelledby="comparison-title"`.
- **Назначение:** «Чем Подкова отличается от бани-бочки»: ширина/ровный пол, отсутствие стяжек, двойной проливной пол, дуга стен по форме тела.
- **Дочерние компоненты:** `CrossSectionDiagram`, `AdvantageItem`, `PhotoSlot`, `diagrams/LabeledDrawing`, `DrainFloorDiagram`, `comparison/BathMarks.jsx` (`Zone`, `ZoneText`, `BathMarksRow` и отметки типов бань), `Button`; схемы используют примитивы `diagrams/Diagram.jsx`.
- **Assets:** `diagram-sravnenie.webp` (прозрачный рисунок с SVG-размерами поверх), `shirina-parnaya.webp`, `diagram-obvyazka.webp`, `obvyazka.webp`, `prolivnoy-pol-sverhu.webp`, `prolivnoy-pol-razrez.webp`, `diagram-duga.webp`. Подписи и выноски не запечены в этих чертежах целиком: часть создаётся SVG-кодом.
- **Текст:** прямо в JSX и props элементов сравнения; геометрия/подписи схем — в соответствующих компонентах.
- **CTA/ссылки:** «Узнать цену Подковы» → `compare_cta` → `requestCalcOpen()`.
- **Формы:** отсутствуют. Фон `ink`, сравнение различает `podkova` и `alert-on-dark`.

### 2.9. Устройство — «Что внутри»

- **Компонент/файл:** `SectionInside`, `src/components/SectionInside.jsx`. Собственного `id` у section нет; связь с заголовком — `inside-title`.
- **Текст:** локальные `SECTIONS`/`DETAILS` и JSX. Основные темы: вентиляция, «второе дыхание», утепление, гидроизоляция, печь, дерево, кровля; отдельно ручка двери и слив.
- **Дочерние компоненты:** `ResponsivePhoto`, `PhotoSlot`, `AnnotatedPhoto`/`PhotoTag`, `Button`; `SectionDivider` и `DrainPhoto` — локальные функции этого файла.
- **Assets:** `vnutri-ventilyaciya-*`, `vnutri-vtoroe-dyhanie-*`, `vnutri-gidroizolyaciya-*`, `vnutri-krovlya-*`, `vnutri-ruchka-dveri-*`, `vnutri-sliv-*` (640/1280); `vnutri-uteplenie-640.webp` без большого варианта; `pech.webp`, `derevo.webp`. У фото слива координаты рамки/подписи заданы в SVG поверх изображения.
- **CTA/ссылки:** «Посмотреть баню вживую» → `#showroom`; отдельной цели клика в этом CTA нет.
- **Формы:** отсутствуют. Фон `surface`. Внутренние разделители — тонкие линии и обводная капсула с акцентным текстом, не заголовки новой секции main.

### 2.10. Порядок заказа

- **Компонент/файл:** `SectionProcess`, `src/components/SectionProcess.jsx`, `#process`.
- **Текст:** локальные `STEPS` и `SUMMARY`, заголовок «Как проходит заказ». Пять шагов: «Заявка и расчёт», «Просмотр и договор», «Изготовление», «Доставка и установка», «Гарантия и обслуживание». У каждого срок и колонки «Делаем мы»/«Делаете вы»; при отсутствии действий клиента выводится «Ничего».
- **Дочерние компоненты:** `Button`; нумерованный список и панели непосредственно в JSX.
- **Assets:** нет.
- **CTA/ссылки:** «Рассчитать стоимость» → `#calculator`, `process_cta_click`. Адрес шоурума в тексте шага не является отдельной ссылкой.
- **Формы:** нет. Реальный фон `forest`, светлый текст, светлая панель действий клиента с акцентной левой границей.

### 2.11. Просмотр перед покупкой

- **Компонент/файл:** `SectionShowroom`, `src/components/SectionShowroom.jsx`, `#showroom`; форма — `#visit-form`.
- **Дочерние компоненты:** `showroom/VisitCard`, `showroom/VisitForm`, `ResponsivePhoto`, `Button`.
- **Текст/данные:** `src/data/visit.js`: «Посмотрите баню до покупки», варианты шоурум/производство/видеозвонок, адреса, описания, подписи галерей, кнопки, варианты переключателя. Шоурум — Киров, ул. Ленина, 71Б; производство — Северное Кольцо.
- **Assets:** `shourum-menedzher-*`, `shourum-{1-vhod,2-parnaya,3-komnata,4-pech}-*`; `proizvodstvo-{1-obvyazka,2-pol,3-dugi,4-obshivka,5-gotova}-*`; `video-zvonok-*`, ширины 640/1280. Главное фото производства повторно использует пятый кадр галереи.
- **CTA/ссылки:** запись в шоурум/на производство/на видеозвонок → установка `visitType`, `visit_button {type}`, прокрутка к форме. Внешние запросы принимаются через `onVisitRequest`; FAQ может выбрать шоурум с аналитическим параметром `type: faq`.
- **Форма:** `VisitForm`, тип `visit`, цель `visit_submit {type}`. Видеозвонок здесь означает заявку менеджеру, а не встроенный видеочат.
- **Оформление:** секция `surface`, карточки `surface-2`, форма на `forest`.

### 2.12. Частые вопросы

- **Компонент/файл:** `SectionFaq`, `src/components/SectionFaq.jsx`, `#faq`.
- **Дочерние компоненты:** `FaqQuestionForm`; локальные функции разбора ссылок/ответов. Нативные `<details>/<summary>`, допускается несколько раскрытых ответов одновременно.
- **Текст:** 18 элементов `FAQ` из `src/data/faq.js`, поля `q`, `text`, `list`, `after`, `n`, `group`; простая разметка `[текст](#id)` превращается во внутренние ссылки. `plainAnswer()` подготавливает те же ответы для JSON-LD `FAQPage`.
- **Assets:** нет; значок раскрытия — код интерфейса.
- **CTA/ссылки:** внутренние `#calculator`, `#visit-form`; ссылка на запись вызывает `requestVisit('showroom', 'faq')`. Ссылка из ответа про бизнес просто ведёт к калькулятору и сама не включает бизнес-вкладку. Открытие ответа → `faq_open {question: n}`.
- **Форма:** `FaqQuestionForm`, тип `faq_question`, цель `faq_question_submit`.
- **Оформление:** фон `surface-2`; тонкие границы вопросов, знак «+» поворачивается, отдельной анимации высоты ответа нет.

### 2.13. Финальная заявка

- **Компонент/файл:** `SectionFinal`, `src/components/SectionFinal.jsx`, `#final`.
- **Дочерний компонент:** `FinalForm`.
- **Текст:** заголовок «Рассчитаем вашу баню» и пояснения в JSX; время ответа вычисляет `callbackWhen()`.
- **Assets:** нет.
- **CTA/ссылки:** отправка формы; телефон и ссылка `/privacy/` в форме.
- **Форма:** тип `final`, цель `final_submit`, подробности в разделе 6.
- **Оформление:** `forest`, центрированная колонка максимум 600 px; собственные вертикальные padding 80/128 px, а не стандартные 64/96.

### 2.14. Footer

- **Компонент/файл:** `Footer`, `src/components/Footer.jsx`.
- **Дочерние элементы:** логотип, контактные/юридические строки, inline иконка VK; универсальной системы колонок footer нет.
- **Assets:** `logo-128.webp`, `logo-256.webp`.
- **Текст:** в JSX; телефон из общего `PHONE`; copyright содержит фиксированный 2026 год. Указаны шоурум и время 9:00–17:00.
- **CTA/ссылки:** логотип → `#top`, `tel:+78332775770`, `/privacy/`, `https://vk.ru/banivyatki_ru` (новая вкладка, `noopener`, цель `vk_click`). Для телефона действует `phone_click`.
- **Формы:** нет. Фон `ink`, второстепенный текст `muted-on-dark`, сразу после финальной секции.

## 3. Design system

### 3.1. Палитра и токены

Значения определены в `:root` файла `src/styles/tokens.css`. `tailwind.config.js` отображает их в `theme.extend.colors`; Tailwind-имя `surface-2` соответствует CSS `--color-surface-2` и так далее.

| CSS variable | Значение | Использование / Tailwind-имя |
| --- | --- | --- |
| `--color-ink` | `#1a1512` | Тёмный фон hero/сравнения/карты/footer, основной текст светлых блоков; `ink` |
| `--color-forest` | `#10231d` | Тёмно-зелёный фон преимуществ, процесса, записи и финала; `forest` |
| `--color-surface` | `#f4eadf` | Кремовый фон/панели и текст на тёмном; `surface` |
| `--color-surface-2` | `#ece1d3` | Более тёмная светлая поверхность; `surface-2` |
| `--color-accent` | `#c98a2e` | CTA, активные состояния, схемы, акцентные полосы; `accent` |
| `--color-accent-hover` | `#b57c29` | Hover основной кнопки; `accent-hover` |
| `--color-accent-active` | `#a57023` | Нажатие основной кнопки; `accent-active` |
| `--color-muted` | `#6e7a6a` | Второстепенный текст/линии на светлом; `muted` |
| `--color-alert` | `#8c3f1d` | Ошибки и проблемные элементы на светлом; `alert` |
| `--color-price` | `#2f6b3a` | Цена выполненного объекта на светлом; `price` |
| `--color-muted-on-dark` | `#9aa396` | Второстепенный текст/линии на тёмном; `muted-on-dark` |
| `--color-alert-on-dark` | `#d9663a` | Ошибки/проблемные места на тёмном; `alert-on-dark` |
| `--color-podkova` | `#7fb069` | Положительная отметка Подковы в сравнении; `podkova` |

Не подменять `muted-on-dark` на `muted` и `alert-on-dark` на `alert` в тёмных секциях: варианты специально разделены для читаемости. Золотой акцент не является основным цветом длинного текста. `price` применяется на светлой поверхности, а золотая стартовая цена hero — отдельный случай.

### 3.2. Типографика

Шрифт — **Onest**, Google Fonts подключён в обоих HTML-входах с весами 400 и 700. `--font-family-sans`: `'Onest', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`; Tailwind `font-sans`. Локальных файлов шрифта нет. Body: 400, сглаживание `antialiased`.

| Tailwind-класс / CSS variable размера | Размер | Line-height | Вес |
| --- | --- | --- | --- |
| `text-heading` / `--font-size-heading` | `clamp(32px, 5vw, 56px)` | `--line-height-heading: 1.05` | 700 |
| `text-lead` / `--font-size-lead` | `clamp(18px, 2.2vw, 24px)` | `--line-height-lead: 1.45` | 400 |
| `text-title` / `--font-size-title` | 20 px | `--line-height-title: 1.2` | 700 |
| `text-body` / `--font-size-body` | 17 px | `--line-height-body: 1.5` | 400 |
| `text-label` / `--font-size-label` | 14 px | `--line-height-label: 1.2` | 400 |

Особые размеры задаются локальными Tailwind utilities: hero H1 на mobile `clamp(30px, 8vw, 38px)`, desktop `clamp(40px, 3.38vw, 49px)`, line-height 1.05; текст hero 20 px/1.4, стартовая цена 32 px. Текст отзывов 15 px/1.55, источник 13 px. Процесс: H3 22 px/1.2, описания 16 px/1.5, цифры шагов 20 px и 40 px desktop. Встречается `font-semibold`, хотя отдельный вес 600 не запрошен в Google Fonts.

SVG-подписи `.dg-label` держат экранный размер 14 px через `font-size: calc(var(--font-size-label) / var(--s, 1))`; `--s` обновляет `useUnitScale` через ResizeObserver. Отдельная вертикальная подпись главной схемы на mobile уменьшена до 12 px.

### 3.3. Контейнеры, padding и spacing

| Токен | Значение | Tailwind |
| --- | --- | --- |
| `--container-max` | 1200 px | `max-w-container` |
| `--measure` | 60ch | `max-w-measure` |
| `--gutter-mobile` | 24 px | `px-gutter` |
| `--gutter-desktop` | 48 px | `md:px-gutter-lg` |
| `--section-y-mobile` | 64 px | `py-section-y` |
| `--section-y-desktop` | 96 px | `md:py-section-y-lg` |

Обычный wrapper: `mx-auto max-w-container px-gutter md:px-gutter-lg`. Максимум 1200 px включает внутренние padding; при desktop padding полезная внутренняя ширина — 1104 px. Большие gutter/vertical padding включаются уже с **768 px**, хотя основная desktop-перестройка ряда блоков начинается с 1024 px.

`py-section-y` означает отступ с каждой стороны секции, а не gap между секциями. Соседние стандартные блоки дают расстояние контента через сумму нижнего/верхнего padding. Между фоновыми прямоугольниками дополнительных внешних зазоров обычно нет. Типичный промежуток от заголовка к содержимому — `mt-12`/`md:mt-16` (48/64 px), вводный текст — `mt-4` (16 px).

Исключения: hero использует собственную геометрию (mobile padding текста 20 px по горизонтали, 24 px сверху, 48 px снизу; desktop колонка 42%, слева 48 px, сверху 80 px). Header — 16/32 px horizontal. Final — 80/128 px vertical. Footer — 48/64 px vertical. Внутри `SectionInside` большие разделители имеют 112/160 px перед первым разделом, 80/112 px между группами; обычные строки 40/56 px. Размеры — текущие локальные решения, не дополнительные глобальные токены.

### 3.4. Геометрия, borders, shadows, badges

Глобальных tokens радиусов, теней и границ нет. Преобладают `rounded-md` = 6 px (кнопки, фото, карточки, панели), `rounded` = 4 px (inputs), `rounded-sm` = 2 px, `rounded-full` для аватаров, телефона и капсул. Обычная граница — 1 px `muted`/приглушённый светлый, secondary Button — 1.5 px, левая линия отзыва/панели процесса — 3 px `accent`, бизнес-цитата — 2 px `accent`.

Дизайн в основном плоский. Нет единой тени для всех карточек. Частные тени: primary Button hover `0 4px 14px rgba(26,21,18,.22)`; выбранная карточка — акцентная inset-обводка; логотип — мягкая тёмная тень; `SourceIcon` — `drop-shadow(0 2px 8px rgba(26,21,18,.18))`; hero содержит собственные тени/градиенты для читаемости.

Hero `RatingBadge`: полупрозрачный тёмный фон `rgba(20,14,10,.35)`, рамка `rgba(244,234,223,.22)`, радиус 6 px, рейтинг 28 px, счётчик 13 px. `PhotoTag` — тёмно-зелёная плашка с кремовым текстом поверх фото. Внутренний `SectionDivider` — обводка 1.5 px `accent`, прописной текст 13 px, letter-spacing .08em, тонкие линии по сторонам; на узких экранах шрифт уменьшается.

### 3.5. Кнопки и переключатели

`src/components/Button.jsx` — основной компонент, `as="button"` либо `as="a"`, variants `primary`/`secondary`/`link`, schemes `light`/`dark`, размеры `lg`/`md` и малый link `sm`, `full`, `fullMobile`, `arrow`.

- Primary: фон `accent`, текст `ink`; hover `accent-hover`, active `accent-active`.
- Secondary light: прозрачный фон, акцентные border/text; hover с акцентной заливкой и `ink`.
- Secondary dark: светлые border/text; hover светлая заливка и `ink`.
- Link: акцентный текст и подчёркивание; компактные ссылки раскрытия.
- `lg`: minimum height 56 px, horizontal padding 32 px, vertical 12 px, текст 17 px. `md`: 44 px, padding 20/8 px, текст 15 px.
- Стрелка 20 px с тонким SVG stroke, при hover смещается на 3 px; transition 150 ms. Disabled — opacity 60%; focus outline 2 px, offset 3 px.

`calculator/Segmented.jsx` — общий переключатель/radiogroup. Обводная панель `rounded-md`, padding 4 px, равные колонки; схемы light/dark/accent. Выбранный вариант получает контрастную заливку; маленькие элементы имеют высоту 44 px, очень узкие экраны уменьшают текст. Предусмотрена навигация стрелками. Новые переключатели целесообразно строить на этом компоненте.

### 3.6. Карточки и формы

- WorkCard — фото и свободная flex-колонка, без общей рамки/тени; цена и CTA прижаты вниз для выравнивания ряда.
- OwnerReviewCard — `surface`, radius 6 px, padding 24 px, левая полоса `accent` 3 px, без объёмной тени.
- CalculatorCard — варианты с изображением, планировкой, описанием и ценой; selected state обозначается существующей акцентной геометрией. Это специализированная карточка расчёта, не общий шаблон продукта.
- VisitCard — `surface-2`, radius 6 px, padding 20/32/40 px в зависимости от ширины, фото/контент и галерея.
- Панель выбранного калькулятора — максимум 560 px, фон `surface-2`, padding 20/32 px, radius 6 px; временная подсветка при переходе.
- Светлые inputs: фон `surface` (в FAQ `surface-2`), border `muted` 1 px, radius 4 px, padding 16 px по горизонтали/12 px по вертикали, текст 17 px. Тёмные inputs: прозрачный фон, светлая граница с opacity около 28%, кремовый текст и `muted-on-dark` placeholder.
- Между полями обычно 16 px; подписи около 15 px, checkbox 16 px с акцентным цветом. Ошибки используют `alert` либо `alert-on-dark`. Success — inline-панель вместо формы; отдельной страницы благодарности/redirect нет.

В проекте **нет** универсальных `Card`, `Input`, `FormField`, `SectionContainer` или отдельной theme-библиотеки. Повторяющиеся input-классы пока локальны в формах; не следует ссылаться на несуществующие абстракции как на готовые компоненты.

## 4. Responsive

### 4.1. Breakpoints

Tailwind использует стандартные `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`, `2xl: 1536` px: `screens` не переопределены. Это доступные пороги конфигурации, а не утверждение, что каждый используется одинаково часто. Основные реальные переключения — `md`, `lg` и custom `min-[600px]`; есть локальные правила 400 px и ограничения до 479/379/359 px для компактных текстов/разделителей.

### 4.2. Поведение блоков

| Блок | Mobile / узкий экран | Tablet / промежуточная ширина | Desktop |
| --- | --- | --- | --- |
| Header / hero | До 1024: логотип 48, телефон-плашка высотой 44; мобильное фото сверху, текст снизу; CTA full width | Та же композиция до 1023 | От 1024: логотип 64, текстовый телефон 20 px; текст слева 42%, фото справа; высота hero `clamp(640px,90vh,900px)` |
| Works | До 600: 1 колонка | 600–1023: 2 | От 1024: 3; gaps 16/24 по горизонтали, 32/40 по вертикали |
| Reviews | До 768: 1 колонка | 768–1023: 2 | От 1024: 3; gap 24 |
| Calculator | До 1024: 1 карточка в ряд; форма ниже выбора, sticky CTA при выполнении условий | Также 1 колонка до 1023, просторнее padding | От 1024: 3 карточки, бизнес-режим 2 колонки, sticky CTA нет |
| Benefits | До 600: 1 колонка | 600–1023: 2 | От 1024: 4 |
| Comparison | До 600: основная схема двумя равномасштабными частями друг под другом, подписи карточек номерами/списком | От 600: главная схема целиком, пары фото в 2 колонки | От 1024: сравнительные зоны в 2 колонки |
| Inside | До 768: сначала фото, затем текст | От 768: фото/текст в 2 колонки, чередование сторон | Та же композиция, больше отступы; details также 2 колонки |
| Process | До 1024: компактный номер, «мы» над «вы» | С 768 увеличиваются общие padding | От 1024: крупный номер, две колонки «мы»/«вы» |
| Showroom | Основное фото над текстом, галереи по 2; пятый производственный кадр занимает 2 колонки | До 1023 та же основная последовательность | От 1024 фото/текст рядом, производство зеркально; галереи 4/5 колонок, видео 1/3 + 2/3 |
| Map | До 1024 высота 360 px; на coarse pointer включение взаимодействия отдельным касанием | То же до 1023 | От 1024 высота 480 px; колесо не приближает карту |
| Final / Footer | Форма в одной узкой колонке; footer одна центрированная колонка | С 768 увеличены вертикальные padding | Footer от 1024 три колонки с выравниванием по левому краю |

Ширина планшета не имеет отдельной универсальной «tablet» темы: несколько независимых порогов действуют одновременно. При 768–1023 px gutter уже 48 px, но многие блоки ещё в мобильной раскладке.

В калькуляторе автоматическая прокрутка к форме учитывает верхний offset 96 px; desktop также переводит фокус на телефон. Mobile sticky bar: `z-20`, высота около 64 px плюс `env(safe-area-inset-bottom)`. Header не содержит мобильного меню; создавать описание его поведения как существующего нельзя.

Просмотрщики работ/отзывов — fixed overlay `z-50`, закрытие, клавиатура и touch-жесты; блокируют прокрутку документа. Наличие dialog/клавиатурных обработчиков не означает, что все аспекты focus trap уже реализованы как в полноценной dialog-библиотеке. Общий `:focus-visible` и `prefers-reduced-motion` находятся в `src/index.css`: контур 2 px `accent`, offset 3 px; reduced motion почти обнуляет длительности анимаций/переходов. Hero анимация также отменяется при взаимодействии и reduced motion.

## 5. Повторно используемые компоненты

Пути ниже относительно корня репозитория. Приоритет — переиспользовать готовые визуальные/поведенческие элементы, но не переносить специализированную бизнес-логику карточки в новый блок без необходимости.

| Component | Файл | Где используется | Назначение / рекомендация |
| --- | --- | --- | --- |
| **Button** | `src/components/Button.jsx` | CTA секций, карточек, форм | Базовый стиль кнопок/ссылок; основной кандидат для новых CTA |
| **ResponsivePhoto**, `photoSrc` | `src/components/ResponsivePhoto.jsx` | Работы, showroom, inside; карточки | WebP srcset/sizes, aspect ratio, lazy loading; основной кандидат для фото |
| **PhotoSlot** | `src/components/PhotoSlot.jsx` | Comparison, Inside | Одиночное фото либо placeholder; для assets без стандартной пары |
| **AnnotatedPhoto**, `PhotoTag` | `src/components/AnnotatedPhoto.jsx` | Inside | Фото с координатными выносками и плашками; сохранять систему координат |
| **Segmented** | `src/components/calculator/Segmented.jsx` | Режим/сезон калькулятора, способ связи и просмотра | Общие переключатели, radio semantics и клавиатура |
| **LeadForm** | `src/components/calculator/LeadForm.jsx` | Калькулятор, бизнес | Готовая общая форма двух сценариев с защитой/отправкой/аналитикой |
| CalculatorCard | `src/components/calculator/CalculatorCard.jsx` | Calculator | Специализированная выбираемая комплектация; не универсальная карточка каталога |
| FloorPlan | `src/components/calculator/FloorPlan.jsx` | CalculatorCard | SVG-планировка бани по варианту |
| WorkCard | `src/components/works/WorkCard.jsx` | Works | Реализованный объект: фото, комплектация, цена, связанный расчёт |
| Lightbox | `src/components/works/Lightbox.jsx` | Works | Модальная галерея объекта |
| MapBlock | `src/components/works/MapBlock.jsx` | Works | Lazy карта объектов и fallback; не отдельная секция App |
| OwnerReviewCard | `src/components/reviews/OwnerReviewCard.jsx` | Reviews | Отзыв владельца с раскрытием/фотографиями |
| Avatar | `src/components/reviews/Avatar.jsx` | OwnerReviewCard | Инициалы автора, круглая плашка |
| PhotoViewer | `src/components/reviews/PhotoViewer.jsx` | Reviews | Просмотр фотографий конкретного отзыва |
| ReviewCard | `src/components/ReviewCard.jsx` | Business в Calculator | Отдельный формат бизнес-цитаты; не тот же OwnerReviewCard |
| **RatingStars** | `src/components/RatingStars.jsx` | Hero, отзывы | Звёзды рейтинга, вариант outline |
| **SourceIcon** | `src/components/SourceIcon.jsx` | Отзывы, бизнес-цитата | Выбор подходящего asset площадки по размеру; варианты round/square |
| VisitCard | `src/components/showroom/VisitCard.jsx` | Showroom | Карточка способа просмотра, галерея, CTA |
| VisitForm | `src/components/showroom/VisitForm.jsx` | Showroom | Запись на выбранный способ просмотра |
| FaqQuestionForm | `src/components/FaqQuestionForm.jsx` | FAQ | Вопрос менеджеру с телефоном |
| FinalForm | `src/components/FinalForm.jsx` | Final | Финальная заявка в тёмной теме |
| AdvantageItem | `src/components/AdvantageItem.jsx` | Comparison | Текстовая часть сравнительного преимущества |
| CrossSectionDiagram | `src/components/CrossSectionDiagram.jsx` | Comparison | Основная схема бочка/Подкова, mobile split |
| **Diagram**, `Thin`, `Label`, `Dot`, hooks | `src/components/diagrams/Diagram.jsx` | Схемы и их обёртки | Общие тонкие SVG-линии, стрелки, labels, цветовые схемы, масштаб |
| LabeledDrawing | `src/components/diagrams/LabeledDrawing.jsx` | Comparison | WebP-чертёж с SVG-подписями; номера/список на mobile |
| DrainFloorDiagram | `src/components/diagrams/DrainFloorDiagram.jsx` | Comparison | Специализированная схема проливного пола |
| MicroDiagram | `src/components/diagrams/MicroDiagram.jsx` | DrainFloorDiagram внутри Comparison | Обёртка Diagram по умолчанию 240×150; не самостоятельная секция |
| Zone, ZoneText, BathMarksRow, отметки | `src/components/comparison/BathMarks.jsx` | Comparison | Общие зоны и подписи типов бань |
| BenefitIcon | `src/components/benefits/BenefitIcons.jsx` | Benefits | Набор тематических SVG-иконок |
| CatalogCard / CatalogDialog / CatalogForm | `src/components/catalog/` | CatalogSection | Карточка модели, доступный viewer/form dialog, строго catalog-сценарий; не переиспользовать как произвольную CRM-форму без нового контракта |
| Header / Footer | `src/components/Header.jsx`, `Footer.jsx` | App; Footer также PrivacyPage | Общий бренд/контакты/юридическая навигация |

Для новых секций в первую очередь нужны **Button, ResponsivePhoto/PhotoSlot, Segmented, RatingStars/SourceIcon**, а для заявок — существующая форма подходящего сценария и общие helpers. Для чертежей — `Diagram`/`LabeledDrawing`, для фото с выносками — `AnnotatedPhoto`.

`RatingBadge` hero и `SectionDivider`/`DrainPhoto` inside пока локальные функции. Универсального экспортируемого компонента разделителя нет: при реальной необходимости повторного использования нужно отдельно согласовать минимальное извлечение, а не копировать разметку в несколько файлов. Присутствие `MicroDiagram` не служит основанием добавлять новый визуальный блок без задания.

Вне React-компонентов обязательно переиспользовать: `submitLead`, phone helpers, `getUtm`, `track`, `callbackPromise`, `requestCalc`/`requestCalcOpen`, `requestVisit`. Они содержат общий протокол, а не только оформление.

## 6. Формы и интеграции

### 6.1. Сценарии заявок

| Форма / компонент | Поля посетителя | Контекст payload | Success goal |
| --- | --- | --- | --- |
| Каталог / `catalog/CatalogForm` | Телефон, необязательное имя, звонок/MAX, обязательное согласие | `form: catalog`, строгое `catalog_model: podkova-35/podkova-45/podkova-60` | `catalog_submit {model}` |
| Расчёт / `calculator/LeadForm` | Телефон, необязательное имя, звонок/MAX, обязательное согласие | `form: calculator`, выбранная карточка, сезон, название/размер, `option_shown`, `price_shown` | `calc_submit` |
| Бизнес / тот же `LeadForm` | Телефон, имя, компания, комментарий, звонок/MAX, согласие | `form: business`, `company`, `comment` | `business_submit` |
| Запись / `showroom/VisitForm` | Способ просмотра, имя, телефон, звонок/MAX, согласие | `form: visit`, `visit_type: showroom/production/video` | `visit_submit {type}` |
| Вопрос / `FaqQuestionForm` | Обязательный вопрос, телефон, имя, звонок/MAX, согласие | `form: faq_question`, `question` | `faq_question_submit` |
| Финальная / `FinalForm` | Телефон, имя, звонок/MAX, согласие | `form: final` | `final_submit` |

Общее: нормализованный `+7` телефон, пять UTM-полей, `page_url`, `submitted_at` (ISO), `elapsed_ms`, скрытое `website` (honeypot). `referrer` добавляет общий helper отправки. Согласие проверяется UI, но отдельное значение/версия согласия в payload и журнале сервером сейчас не сохраняются. Server whitelist не сохраняет все технические frontend-поля карточки: прежде всего использует `option_shown`/`price_shown`, а не весь объект React.

### 6.2. Отправка, валидация, success/error

Единая точка `src/lib/submitLead.js`: `POST /api/lead.php`, JSON, `Content-Type: application/json`, `credentials: omit`; путь строится через `import.meta.env.BASE_URL`. Browser timeout — 15 секунд с AbortController. Успех — HTTP ok и JSON `ok === true`. Неверный JSON, HTTP error, network/timeout возвращают `{ok:false,error}`; форма показывает общий текст ошибки и телефон, сохраняет введённые значения. Состояния — idle/sending/done/error, во время отправки повторная кнопка отключается. При успехе форма заменяется подтверждением; каталог обещает связь и отправку менеджером без указания callback schedule, старые формы — время звонка; цель аналитики отправляется после ответа; у LeadForm вызывается необязательный `onSuccess`.

Телефон форматируется/валидируется через `src/lib/phone.js`. PHP повторно проверяет: допускает десять цифр либо российский номер с ведущей 7/8 и приводит к `+7…`; invalid отклоняется. Вопрос обязателен для вопросной формы; имя не является обязательным общим полем.

Antispam: заполненная ловушка либо заполнение быстрее 3 секунд дают имитацию success без отправки и без success goal на frontend. Backend независимо от UI также отбрасывает слишком быстрые/ловушечные заявки с `200 {ok:true}`. Это не CAPTCHA; клиентские elapsed/honeypot можно подделать, а быстрая ручная тестовая отправка тоже может попасть под фильтр.

В dev payload дополнительно выводится в console, но helper всё равно делает настоящий запрос; Vite PHP не обслуживает, поэтому отсутствие backend даёт ошибку, а не успешную заглушку.

### 6.3. Публичный endpoint и приватный backend

`public/api/lead.php` в сборке становится `public_html/api/lead.php`. Он подключает `dirname(__DIR__, 2) . '/private/lib.php'`; на сервере структура должна быть такой:

```text
папка сайта/
  public_html/
    index.html
    assets/
    photos/
    api/lead.php
  private/
    config.php          заполненный конфиг; отсутствует в git
    lib.php             копия server/lib.php
    retry.php           копия server/retry.php
    queue/*.json        заявки для повторной отправки
    queue/failed/       исчерпавшие попытки заявки
    log/                журналы
    ratelimit/          файловый учёт частоты
    retry.lock          блокировка параллельного retry
```

Endpoint допускает только POST; GET возвращает 405, поэтому открытие адреса endpoint браузером не является полноценной проверкой заявки. Если есть Origin, разрешены только основной домен и вариант `www`; отсутствие Origin допускается. Универсальной CORS-поддержки сторонних доменов нет. Размер body ограничен 65 536 байт; проверяются JSON, тип формы и телефон. Rate limit — 5 заявок с одного IP за 600 секунд, превышение — 429. Тексты/URL/UTM обрезаются по серверным пределам; непредусмотренные поля не проходят whitelist. Ошибки конфигурации/сервера возвращают короткие JSON-коды без приватных путей/вебхука.

PHP использует cURL, `mb_*`, JSON, файловую запись и CLI для retry. Проверять наличие соответствующих расширений на хостинге необходимо отдельно от npm-сборки.

### 6.4. Битрикс24: контакт и сделка

Образец — `server/config.sample.php`; фактический `private/config.php` не хранится в репозитории. Конфиг задаёт URL входящего вебхука, портал, ответственного, `deal_category_id`, `deal_stage_id`, источники сайта/Директа, пользовательское поле/значения звонок/MAX, отображение UTM в сделку/контакт. Нужен **REST STAGE_ID стадии**, не произвольный числовой ID строки справочника; категория `0` допустима. Рабочие коды конкретного портала устанавливаются по приватному конфигу, не по sample и не по названию стадии.

Последовательность REST:

1. `crm.duplicate.findbycomm`: поиск существующего CONTACT по нормализованному PHONE.
2. При отсутствии — `crm.contact.add`; при наличии используется первый найденный контакт.
3. `crm.deal.add`: **новая сделка** с привязкой `CONTACT_ID`.

`crm.lead.add` не вызывается: имя `lead.php` обозначает endpoint заявки, а не создание сущности «Лид» CRM.

Новый контакт: `NAME` (при пустом имени «Клиент с сайта»), `PHONE` типа WORK, `ASSIGNED_BY_ID`, `OPENED`, разрешённые конфигом UTM. Существующий контакт не обновляется; его старые имя/UTM не заменяются новой заявкой.

Сделка: `TITLE`, `CATEGORY_ID`, `STAGE_ID`, `ASSIGNED_BY_ID`, `CONTACT_ID`, `SOURCE_ID`, `SOURCE_DESCRIPTION`, `COMMENTS`, отображённые UTM и настроенное пользовательское поле связи. `SOURCE_DESCRIPTION` определяется типом формы. В COMMENTS включаются форма, выбранный вариант, показанная цена, способ связи, компания/комментарий/вопрос/тип визита, URL, referrer, время по Москве, UTM; повторное обращение получает ссылку на контакт.

Источник Директа выбирается только при `utm_source=yandex` и `utm_medium=cpc` (без учёта регистра) и настроенном `source_direct`; иначе `source_site`. Это не определение источника только по referrer. Пять полей — `UTM_SOURCE`, `UTM_MEDIUM`, `UTM_CAMPAIGN`, `UTM_CONTENT`, `UTM_TERM` через mapping конфигурации.

**Поле `OPPORTUNITY` сейчас не устанавливается.** `price_shown` участвует в названии/комментариях расчёта как «от … ₽». Нельзя считать, что сумма сделки автоматически равна цене калькулятора. Выбранный MAX лишь записывает предпочтение в CRM; backend не отправляет сообщение пользователю в MAX.

### 6.5. Очередь и повторные попытки

REST timeout: connect 5 секунд, полный timeout 10 секунд **на отдельный вызов**. При ошибке Битрикс24 заявка сохраняется JSON в `private/queue/`, а frontend получает `ok:true`, если запись очереди удалась. Невозможность записать очередь приводит к серверной ошибке. Значит, success UI/goal подтверждают приём заявки обработчиком, но не гарантируют немедленное создание сделки.

`server/retry.php` запускается только CLI, по HTTP выдаёт 404. Документированная схема запуска — cron каждые 5 минут; наличие действующего cron из git подтвердить нельзя. Блокировка `retry.lock` исключает одновременные retry-процессы. Файлы обрабатываются по порядку, число попыток ограничено 10, включая первую; затем заявка перемещается в `queue/failed/`. Сохранённый `contact_id` позволяет не создавать контакт повторно при повторной отправке. Автоматической обработки failed, уведомлений менеджеру об очереди и отдельного exponential backoff нет.

Журналы дневные, очищаются старше 30 дней; в журнале вместо телефона короткий hash, нет имени/текста вопроса/вебхука. Очередь, напротив, содержит персональные данные, поэтому её место строго вне web root; автоматического срока удаления failed-заявок не видно. Retry также чистит старые rate-limit файлы.

Ограничения: несколько REST-вызовов могут занять дольше browser timeout 15 секунд; сервер способен закончить обработку после того, как браузер показал ошибку. Повторная отправка в такой ситуации или retry после неопределённого результата `deal.add` может создать дубликат сделки. Idempotency key и дедупликация сделок отсутствуют; поиск контакта не устраняет этот риск. Это существующие особенности, не исправленные этой инвентаризацией.

### 6.6. UTM и обещание callback

`src/lib/utm.js`: пять UTM читаются из URL и хранятся в `sessionStorage` (`bv_utm`). Если в новом URL есть UTM, набор перезаписывается; если меток нет, используется сохранённый. Это сохранение в рамках вкладки, **не строго неизменный first touch** и не долгосрочное хранение между визитами. При недоступности storage используется URL-fallback.

`src/lib/callback.js` рассчитывает тексты по `Europe/Moscow`: в рабочие дни 9:00–17:44 — «в течение 15 минут», после 17:45 — следующий рабочий сценарий; есть test override `?now=…`. Текущая ветка для вторника–пятницы до 9:00 буквально возвращает «завтра с 9:00», а не «сегодня» — возможная неточность текста. Footer отдельно показывает 9:00–17:00. Эти расхождения нужно учитывать при будущей правке расписания, не менять незаметно в задаче другого блока.

### 6.7. Яндекс.Метрика и analytics

Счётчик главной страницы задаётся в `index.html`, идентификатор в `src/lib/track.js` — `113423850` (публичный ID, не credential). Включены webvisor, clickmap, accurateTrackBounce, trackLinks; присутствует noscript-пиксель. `track(goal, params)` в production вызывает `ym(..., 'reachGoal', ...)`, безопасно пропускает отсутствие ym/ошибку; в dev пишет в console. В HTML страницы политики счётчик отдельно не подключён; общий обработчик телефона там не создаёт работающий счётчик сам.

| Группа | Цели и параметры |
| --- | --- |
| Каталог | `catalog_plan_open {model}`, `catalog_open {model}`, `catalog_submit {model}` |
| Контакты | `phone_click`, `vk_click` |
| Работы | `works_photo_open {name}`, `works_calc_click {name}` |
| Отзывы | `review_expand {label}`, `review_photo_open {label}`, `reviews_show_more` |
| Калькулятор | `business_tab_open`, `calc_season_change {season}`, `calc_card_select {card_id}`, `calc_submit`, `business_submit` |
| CTA секций | `benefits_cta`, `compare_cta`, `process_cta_click` |
| Запись | `visit_button {type}`, `visit_submit {type}` |
| FAQ / финал | `faq_open {question}`, `faq_question_submit`, `final_submit` |
| Карта | `map_view`, `map_point_click {name}`, `map_far_click {name}`, `map_fallback_cta` |

Клики по `tel:` отслеживает один делегированный обработчик документа. Не добавлять отдельный `phone_click` в каждый телефон: это даст двойные события. Наличие вызовов целей в коде не подтверждает настройку целей в кабинете Метрики. Google Analytics, GTM, ecommerce, рекламные pixels, calltracking и отправка email в коде отсутствуют.

### 6.8. Карты, мессенджеры, другие внешние ссылки

`src/lib/ymaps.js` подгружает Яндекс Карты v3 по build-time `VITE_YMAPS_KEY`, ждёт готовность, при возможности импортирует `@yandex/ymaps3-controls@0.0.1` через API. Это внешняя runtime-подгрузка, не dependency package.json. Ключ `VITE_*` доступен браузеру; его ограничения referer/квоты настраиваются в кабинете Яндекса, значения здесь не приводятся.

`MapBlock` начинает загрузку при приближении на 300 px через IntersectionObserver; loader переиспользует promise. Timeout загрузки скрипта — 15 секунд. На ошибке/отсутствии ключа остаются смысловой текст и CTA расчёта доставки; нет бесконечно пустой карты. Отсутствие модуля zoom-кнопок не отменяет саму карту. Автоматической повторной попытки компонента при изменении сети после ошибки нет.

Координаты/группы/границы — `src/data/objects.js`, порядок координат API `[longitude, latitude]`. Это преимущественно населённые пункты, не доказанные адреса конкретных клиентов. `scripts/geocode.mjs` обращается к HTTP Геокодеру и **переписывает этот файл**, поэтому его нельзя запускать как безобидную проверку документации. Карта не вызывает геокодер при каждом посещении.

Колесо мыши прокручивает страницу (`scrollZoom` не используется). На coarse pointer взаимодействие включается касанием; подсказка запоминается в `sessionStorage` (`bv_map_hint_seen`).

Telegram/WhatsApp API, bot, webhook либо deep link в текущем коде нет. MAX — вариант предпочтительного способа связи в формах, без SDK/deep link/автоматической переписки. Видеосвязь — тип заявки на показ. Социальная ссылка footer ведёт во VK.

## 7. Assets

### 7.1. Расположение, форматы и naming

В `public/photos/` **126 WebP-файлов**. Дополнительно в корне public — JPEG `og-banivyatki.jpg` 1200×630, PNG favicon 32×32 и apple-touch-icon 180×180; итого 129 растровых файлов в public. AVIF в репозитории нет. Значительная часть иконок/схем реализована inline SVG в JSX, а не отдельными `.svg`-файлами. Шрифты внешние.

Имена — латиница/транслитерация, lowercase, дефисы; название отражает роль, объект, порядок кадра и/или ширину:

| Семейство | Пример / назначение |
| --- | --- |
| Hero | `hero-autumn-1920.webp`, `hero-autumn-mobile-1080.webp` |
| Работы | `obekt-1-zoniha-glavnoe-640.webp`, `obekt-1-zoniha-2-1280.webp` |
| Интерьер | `vnutri-ventilyaciya-640.webp`, `vnutri-sliv-1280.webp` |
| Шоурум | `shourum-2-parnaya-1280.webp` |
| Производство | `proizvodstvo-3-dugi-640.webp` |
| Калькулятор | `size-4-5m.webp`, `kalkulyator-zima-45m-1280.webp` |
| Фото отзывов | `otzyv-01-foto-1-320.webp`, `otzyv-01-foto-1-full.webp` |
| Логотип / источники | `logo-128.webp`, `review-avito-56.webp`, `rating-yandex-maps-128.webp` |
| Чертежи | `diagram-sravnenie.webp`, `diagram-obvyazka.webp`, `diagram-duga.webp` |

Единой автоматической обработки изображений в npm/Vite pipeline нет: размеры/форматы уже подготовлены в public. Шесть master JPG каталога сохранены без изменений только локально в `source-assets/catalog/`, вне Git/public; `.gitignore` исключает `/source-assets/catalog/*.jpg`; остальные исторические исходники системно не представлены. Для каталога: фото WebP quality90, планы95, LANCZOS resize без crop/цветокоррекции,640×478/1280×956. Подробные размеры/вес — `docs/CATALOG_IMPLEMENTATION.md`. Public assets копируются даже при отсутствии импорта/использования в React; новые файлы увеличат публикуемую сборку напрямую.

### 7.2. Responsive images и ограничения

`ResponsivePhoto`: стандартно `[640,1280]`, width-descriptor srcset, caller задаёт `sizes` под реальную сетку; aspect ratio обычно 4/3, доступен 3/4. Есть явные width/height, `object-cover`, radius 6 px, `loading="lazy"`, `decoding="async"`; при малом исходнике можно передать только `[640]`. Функция `photoSrc` использует BASE_URL. Не создавать фиктивный 1280-файл из маленького кадра.

Hero — отдельная art direction через picture: desktop 1280×714 и 1920×1071, mobile 1080×1341. Кадры отличаются композицией; замена требует согласовать picture, preload, зеркальность и градиенты.

Особые одиночные фото: `vnutri-uteplenie-640.webp` 640×853; `pech.webp` 1200×1799 (в UI отдельный crop/позиционирование), `derevo.webp` 1200×800; тёплые `size-*.webp` 800×600. Отзывы имеют отдельные 320-превью и full-файлы с сохранёнными размерами; слово full не гарантирует 1280 px.

`AnnotatedPhoto` выбирает ширину с учётом размера/DPR и начинает загрузку по видимости; это SVG image с overlay, не обычный img srcset. `LabeledDrawing`/`CrossSectionDiagram` лениво устанавливают SVG image href (запас 400 px); у SVG image нет нативного `loading=lazy`. Прозрачные чертежи: сравнение 1600×800, обвязка 1440×850, дуга 1440×1362. SVG выноски привязаны к координатам этих файлов: замена картинки с другим crop/viewBox требует пересчёта геометрии.

SourceIcon выбирает из round 56/80/112 наиболее подходящий для двойной плотности показа; square rating — 128. Текущий hero badge не использует квадратный логотип; наличие asset не означает его отображение. Не удалять «неочевидно используемые» изображения без проверки динамически составляемых имён в data/helper.

Фото под постоянным именем кэшируются на 7 дней. При критичной замене изображения учитывать задержку кэша либо использовать новое осмысленное имя и обновить все ссылки; CSS/JS имеют другой механизм обновления через hash.

Для catalog backend добавлен `bv_catalog_valid`: строгие raw string phone/contact_method/catalog_model, enum call/max и три модели; ошибки →400 bad_request, неверная строка телефона →400 bad_phone. `catalog_model` сохраняется только для catalog, включая очередь. COMMENTS получает доверенное имя модели и серверный запрос; CONTACT, SOURCE_ID и старые mapping не изменены. До публикации нового endpoint требуется отдельно обновить private/lib.php на Beget.

## 8. Короткая карта важных файлов

| Файл / папка | Назначение |
| --- | --- |
| `src/App.jsx` | Фактическая последовательность секций главной страницы |
| `src/main.jsx`, `index.html` | Запуск React, UTM/телефон; SEO, Метрика, font/preload |
| `src/components/Section*.jsx` | Разметка и локальное поведение одиннадцати секций |
| `src/components/Header.jsx`, `Footer.jsx` | Бренд, контакты, общие ссылки |
| `src/styles/tokens.css` | Палитра, типографика, container/gutter/section spacing |
| `tailwind.config.js`, `postcss.config.js`, `src/index.css` | Связь токенов с utilities, pipeline, base CSS и точечные классы |
| `src/components/Button.jsx`, `ResponsivePhoto.jsx` | Общие CTA и responsive фото |
| `src/components/calculator/` | Переключатели, выбор комплектации, SVG-план, общая LeadForm |
| `src/components/works/`, `reviews/`, `showroom/` | Специализированные карточки/галереи/карта/запись |
| `src/components/diagrams/`, `CrossSectionDiagram.jsx`, `AnnotatedPhoto.jsx` | Общая SVG-система и координатные подписи |
| `src/data/calculator.js` | Варианты, стартовые цены, MIN_PRICE, общий PHONE |
| `src/components/catalog/`, `src/data/catalog.js` | Каталог, карточки, dialog/план, отдельная форма и данные3 моделей |
| `source-assets/catalog/`, `docs/CATALOG_IMPLEMENTATION.md` | Локальные JPG (не в Git), README обработки и отчёт/порядок релиза |
| `src/data/works.js`, `objects.js` | Реализованные объекты и отдельный набор точек карты |
| `src/data/reviews.js`, `benefits.js`, `visit.js`, `faq.js` | Контент соответствующих секций |
| `src/lib/submitLead.js`, `phone.js`, `utm.js` | Протокол отправки, телефонная валидация, метки |
| `src/lib/track.js`, `callback.js` | Цели analytics, обещание времени ответа |
| `src/lib/calc.js`, `visit.js`, `ymaps.js` | Межсекционные события, загрузчик карт |
| `public/api/lead.php` | Публичный приём JSON; подключение приватной логики |
| `server/lib.php`, `retry.php`, `config.sample.php` | CRM/очередь, CLI-повтор, схема приватного config |
| `server/tests/` | Backend проверки телефона и полного сценария с REST stub |
| `public/photos/`, `public/og-banivyatki.jpg` | Фото/рисунки/иконки и изображение social preview |
| `public/.htaccess`, `robots.txt` | Apache redirect/MIME/cache, robots |
| `privacy/index.html`, `src/privacy.jsx`, `src/pages/PrivacyPage.jsx` | Отдельная страница политики |
| `vite.config.js`, `package.json`, `package-lock.json` | Две точки сборки, npm-команды, версии |
| `.github/workflows/deploy-beget.yml` | Сборка и FTPS-публикация при main/manual |
| `.github/workflows/pages-redirect.yml`, `pages-redirect/index.html` | Старый GitHub Pages redirect |
| `.env.example` | Имя build-time настройки карт без рабочего ключа |
| `scripts/geocode.mjs` | Уточнение координат с записью objects.js; не read-only проверка |
| `README.md`, `CLAUDE.md` | Памятки/исторические решения; сверять с действующим кодом |

## 9. Ограничения и правила будущих доработок

1. **Менять порядок секций только по явному заданию через App.** Каталог сейчас второй блок. «Наши работы» сейчас третий блок и включает карту; не переносить его и не выделять карту в отдельную секцию как побочный эффект другой задачи.
2. **Сохранять существующие токены и тональность.** Использовать ink/forest/surface/surface-2, Onest, `text-heading/body/lead`, общий wrapper и существующие интервалы. Не добавлять независимую палитру, новую гарнитуру, большие радиусы и повсеместные тени без дизайн-задачи. На тёмном применять соответствующие варианты текста/ошибок.
3. **Переиспользовать компоненты по назначению.** CTA через Button, стандартные фото через ResponsivePhoto, выбор через Segmented, рейтинг через RatingStars/SourceIcon. Для заявок использовать существующие forms/helpers; не копировать LeadForm в новую секцию. Специализированный WorkCard/CalculatorCard не объявлять универсальным Card без отдельной проработки контракта.
4. **Учитывать несколько responsive-порогов.** Desktop основных композиций — 1024, увеличение общих отступов — 768, отдельные сетки/схемы — 600. Проверять минимум 1440, 1024, 768, 600, 390 и 360 px, длинные тексты, клавиатуру и reduced motion. Не фиксировать высоты текстовых карточек, которые ломаются при переносе строк; сохранять выравнивание CTA flex-колонками.
5. **Подготавливать изображения под реально существующие layouts.** Осмысленные имена, WebP-пары при достаточном исходнике, корректные sizes/width/height, alt, lazy кроме hero. Не увеличивать маленькие оригиналы без основания. Для hero согласовать мобильный кадр и preload; для SVG overlay пересчитать anchors/viewBox, а не заменить рисунок «на глаз».
6. **Сохранять источники контента.** Массивы соответствующих секций — в src/data; не дублировать эти массивы в JSX. Общую стартовую цену выводить из MIN_PRICE. Фактические цены объектов WORKS не заменять стартовыми калькулятора. В FAQ сейчас цена 293 000 ₽ также записана буквально в тексте — при изменении прайса нужна отдельная сверка, даже если MIN_PRICE обновился автоматически. Правило из `src/data/reviews.js`: реальные отзывы не переписывать ради рекламного эффекта; допустимы сокращения через многоточие и исправления явных опечаток. Не удалять watermark площадки с фото отзыва и не подменять инициалы фотографиями профиля. Для фото клиентских участков сохранять правило проекта об удалении EXIF.
7. **Сохранять навигационные контракты.** Не менять IDs `top`, `works`, `reviews`, `calculator`, `benefits`, `process`, `showroom`, `visit-form`, `faq`, `final`, `map` без проверки всех ссылок. Использовать requestCalc/requestVisit, если переход должен ещё выбрать состояние; простой anchor этого не делает. Подписки должны очищаться, в том числе при React StrictMode.
8. **Не обходить общий протокол заявок.** Endpoint только через submitLead; нормализация/валидация телефона, UTM, page/referrer/time, honeypot, минимум времени, согласие, sending/error/success сохраняются. Новые form-типы/поля требуют согласованного изменения PHP whitelist, CRM mapping и backend тестов; произвольное добавление frontend поля не гарантирует его попадание в CRM.
9. **Не менять семантику success незаметно.** CRM очередь — существующий предусмотренный сценарий; `ok:true` не равняется «сделка уже видна». Не добавлять client retry без анализа дубликатов. Сумма OPPORTUNITY, idempotency, обработка failed и хранение согласия — отдельные backend задачи, а не побочная правка новой секции.
10. **Сохранять analytics.** Имена целей/параметров использовать последовательно, success goal только после ok helper, не на начальном клике. Не дублировать глобальный phone_click. При новом CTA заранее указать цель либо осознанно сохранить отсутствие отдельной цели; наличие обработчика нужно отдельно проверить в Метрике.
11. **Не размещать приватную конфигурацию в frontend/public/git.** Вебхук Битрикс24 и серверные credentials остаются в private/config.php, FTP — в Actions secrets. VITE-переменные попадают в браузер; ими нельзя хранить серверные секреты. При backend-изменениях учитывать отдельную ручную доставку private и проверку cron.
12. **Сохранять доступность.** Один H1, H2 для новых секций, связанный aria-labelledby, labels/alt, явный фокус, достаточный контраст, управляемые keyboard controls. При новых overlays проверить возврат/удержание фокуса и закрытие; не считать существующие viewers полной универсальной dialog-системой.
13. **Делать проверки по масштабу задачи.** Для UI — npm build и проверка отображения нужных widths/состояний; для PHP — существующие тесты плюс соответствующие новые сценарии. Форма требует PHP-окружения, Vite preview не доказывает работу CRM. Настоящую тестовую заявку, проверку аналитики и cron согласовывать в рамках конкретной задачи, а не считать их выполненными по успешной сборке.
14. **Учитывать автоматическую публикацию main.** Сначала конкретные изменения и review/PR; merge/push main запускает Beget workflow. Документационные изменения тоже подходят под push-trigger. Не выполнять публикацию/ручной запуск/перегенерацию координат как часть read-only инвентаризации.
15. **Не накапливать параллельные дизайн-абстракции.** Новые универсальные components/tokens вводить при реальной повторяемости и ясном контракте. Исторические TODO/PR-статусы из README/CLAUDE не являются подтверждением текущего состояния GitHub. При дальнейших изменениях обновлять этот документ по фактическому коду и явно отделять внешние настройки/непроверенные гипотезы.

### Что остаётся проверить вне репозитория

Рабочие параметры приватного config (ответственный, источник, стадия, поле MAX), расширения/права PHP, расписание cron и содержимое failed, фактическая версия backend на Beget, ограничения ключа карт, цели/счётчик в кабинете Метрики, реальные поля созданных сделок и настройки HTTPS. Этот список обозначает границу достоверности инвентаризации, а не выполненные проверки и не изменения проекта.

### Проверки реализации каталога

`npm run build` прошёл. PHP8.3: phone.test.php —22 случая, handler.test.php —83 проверки, включая catalog и regression. DOM harness вне repo —23 проверки формы/dialog/analytics; native dialog для harness полифиллен. Реальные браузерные проверки 1440/1024/768/600/390/360 px, отсутствие horizontal overflow/CLS и фактический focus trap **не подтверждены**: локальный Chrome аварийно завершается, cloud browser не видит localhost. Production не публиковался. Подробный отчёт/релиз — `docs/CATALOG_IMPLEMENTATION.md`.
