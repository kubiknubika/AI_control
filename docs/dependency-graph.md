# Карта зависимостей прототипа

Документ нужен как карта для будущей диагностики багов. Пока приложение состоит только из меню и аудиосистемы; полноценного игрового ядра ещё нет.

## 1. Общий граф

```mermaid
flowchart TD
    browser[Браузер]
    html[index.html]
    bgLayer[#background-layer\nявный слой изображения]
    bgOverlay[#background-overlay\nзатемнение]
    entry[src/main.ts\nточка входа и экранное состояние]
    styles[src/style.css\nфон, анимация, меню, настройки]
    audio[src/audio.ts\nAudioManager]
    settings[Состояние настроек\nAudioSettings]
    screen[Screen\nmenu | play | tests | settings]
    menu[Главное меню]
    placeholders[Заглушки\nИгра / Тесты]
    settingsScreen[Экран настроек]
    music[public/audio/menu-music.wav]
    soft[public/audio/button-soft.wav]
    arcane[public/audio/button-arcane.wav]
    stone[public/audio/button-stone.wav]
    metal[public/audio/button-metal.wav]
    rune[public/audio/button-rune.wav]
    background[public/assets/menu-fantasy-background.png]
    cursorDefault[public/assets/cursor-default.svg]
    cursorPointer[public/assets/cursor-pointer.svg]
    generator[scripts/generate_menu_audio.py]
    generated[Сгенерированные WAV-файлы]
    vite[Vite\nсборка и dev preview]

    browser --> html
    html --> bgLayer
    html --> bgOverlay
    html --> entry
    entry --> styles
    entry --> audio
    entry --> screen
    entry --> settings
    screen --> menu
    screen --> placeholders
    screen --> settingsScreen
    settingsScreen --> settings
    settings --> audio
    audio --> music
    audio --> soft
    audio --> arcane
    audio --> stone
    audio --> metal
    audio --> rune
    styles --> bgLayer
    styles --> bgOverlay
    styles --> background
    styles --> cursorDefault
    styles --> cursorPointer
    generator --> generated
    generated --> music
    generated --> rune
    vite --> html
    vite --> entry
    vite --> styles
    vite --> background
    vite --> music
```

## 2. Точки входа и ответственность файлов

| Узел | Ответственность | Что не должен знать |
|---|---|---|
| `index.html` | HTML-точка входа, корневой `#app`, явные слои фона и затемнения | Игровые правила и аудиологику |
| `src/main.ts` | Состояние экрана, рендер меню/заглушек/настроек, события UI | Детали генерации WAV |
| `src/audio.ts` | Загрузка музыки и SFX, громкость, выбор пресета, запуск/остановка | Разметку экранов и CSS |
| `src/style.css` | Фон, постоянная анимация фона, карточки, кнопки, бары, scrollbar, курсоры | Переключение экранов и аудиосостояние |
| `public/assets/*` | Визуальные ресурсы | Логику приложения |
| `public/audio/*` | Готовые аудиоресурсы для браузера | UI-состояние |
| `scripts/generate_menu_audio.py` | Повторяемая офлайн-генерация музыкального WAV и рунического SFX | Работа приложения в браузере |
| `vite.config.ts` | Dev-сервер и разрешённый preview host | UI и игровой код |

## 3. Контракты между частями

### `Screen`

```text
menu | play | tests | settings
```

`render(screen)` полностью заменяет содержимое `#app`. Поэтому при добавлении нового экрана нужно помнить, что DOM-элементы предыдущего экрана уничтожаются.

### `AudioSettings`

```text
musicVolume: number       // 0..100
buttonSoundVolume: number // 0..100
buttonSound: ButtonSound
```

### `ButtonSound`

```text
soft | arcane | stone | metal | rune
```

Если добавляется новый вариант звука, его нужно одновременно добавить в четыре места:

1. тип `ButtonSound`;
2. `BUTTON_SOUND_LABELS`;
3. `BUTTON_SOUND_FILES`;
4. создание аудио в конструкторе `AudioManager`.

Затем нужен WAV-файл с соответствующим путём в `public/audio`.

## 4. Потоки событий

### Запуск

```text
index.html
  -> импорт src/main.ts
  -> создаётся AudioManager
  -> применяются настройки громкости
  -> render('menu')
```

Музыка не стартует автоматически до действия пользователя: браузер блокирует autoplay. Первый клик, `pointerdown` или `keydown` вызывает `startMusic()`.

### Нажатие кнопки

```text
click на button
  -> AudioManager.startMusic()
  -> AudioManager.playButtonSound()
  -> чтение data-screen
  -> render(nextScreen)
```

### Изменение громкости

```text
input на range
  -> updateVolumeSetting()
  -> изменение settings
  -> applySettings()
  -> AudioManager.setSettings()
  -> изменение HTMLAudioElement.volume
  -> обновление output с процентом
```

### Выбор звука кнопок

```text
change на select
  -> проверка ButtonSound
  -> изменение settings.buttonSound
  -> applySettings()
  -> AudioManager.setSettings()
  -> остановка старого активного SFX
```

### Фон

```text
index.html
  -> #background-layer
  -> #background-overlay
  -> #app

src/style.css
  -> #background-layer
  -> background-image из menu-fantasy-background.png
  -> animation: background-float
  -> #background-overlay
  -> #app с z-index выше слоёв фона
```

Анимация фона сейчас не управляется JavaScript и не имеет настройки выключения: она является постоянной частью визуального слоя. Явные DOM-слои нужны, чтобы фон не зависел от псевдоэлементов `body` и случайных stacking context-ов экранов.


## 5. Быстрая диагностика по симптому

| Симптом | Сначала проверить |
|---|---|
| Белый/пустой экран | `index.html`, импорт `src/main.ts`, ошибку сборки TypeScript |
| Меню не появляется | `#app`, `render('menu')`, ошибки в начале `main.ts` |
| Фон исчез | URL `/assets/menu-fantasy-background.png`, `#background-layer`, `#background-overlay`, `z-index` |
| Фон не двигается | `animation` в `#background-layer`, `@keyframes background-float`, трансформацию `scale/translate` |
| Музыка не звучит | autoplay-блокировку, URL `/audio/menu-music.wav`, `musicVolume`, `startMusic()` |
| Нет звука кнопок | выбранный `ButtonSound`, путь в `BUTTON_SOUND_FILES`, `buttonSoundVolume`, наличие WAV |
| Смена звука даёт наложение/артефакт | `AudioManager.setSettings()`, `stopButtonSounds()`, повторное использование HTMLAudioElement |
| Ползунок меняется визуально, но громкость нет | `data-setting`, `updateVolumeSetting()`, `AudioManager.applyVolumes()` |
| Настройки выглядят неправильно | `.settings-card`, `.setting-range-row`, `.setting-select` и scrollbar в `src/style.css` |
| WAV нужно пересоздать | запустить `python3 scripts/generate_menu_audio.py`, затем проверить файлы в `public/audio` |

## 6. Правила для дальнейшего расширения

1. Игровые правила держать отдельно от DOM и Phaser/рендера, когда начнётся разработка самой игры.
2. `AudioManager` не должен решать, на каком экране находится игрок.
3. UI не должен напрямую менять `HTMLAudioElement`; для этого используется `AudioManager`.
4. Для нового экрана сначала добавить состояние и переходы в `main.ts`, затем разметку, затем стили.
5. Для нового аудио добавлять ресурс, тип/label/path и проверять, что preview отдаёт файл с правильным MIME-типом.
6. После каждой структурной правки запускать `npm run build`.
7. При проблеме сначала определить слой: `DOM -> состояние -> AudioManager -> ресурс -> CSS`, а не менять несколько слоёв одновременно.
