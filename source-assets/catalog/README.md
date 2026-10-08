# Master assets каталога

Шесть утверждённых JPG2048×1529 сохранены побайтно из пользовательских вложений. Остаются только локально: находятся вне public, Vite их не импортирует. `.gitignore` содержит `/source-assets/catalog/*.jpg`; оригиналы не входят в Git history/PR. В репозитории только этот README и production WebP в public/photos/. Для повторной обработки нужны локальные оригиналы владельца.

Production: public/photos/podkova-{35,45,60}-{catalog,plan}-{640,1280}.webp. Resize Pillow LANCZOS до640×478/1280×956 (без upscale/crop); WebP quality90 для фото,95 для планировок, method6. EXIF/metadata не переносятся. Цвет, фон, текст, композиция и содержание планов не редактировались; sharpening/AI не применялись.

Размеры/вес, контракт и порядок выпуска: docs/CATALOG_IMPLEMENTATION.md. При замене мастеров перепроверять enum/model/image соответствие, aspect ratio и читаемость планов.
