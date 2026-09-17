# Карта зависимостей прототипа

Документ нужен как карта для будущей диагностики багов. Сейчас приложение содержит главное меню, экран выбора сложности и тестовый бой 1 на 1; полноценного игрового ядра ещё нет.

## 1. Общий граф

```mermaid
flowchart TD
    browser[Браузер]
    html[index.html]
    entry[src/main.ts\nточка входа и экранное состояние]
    styles[src/style.css\nфон, анимация, меню, настройки]
    audio[src/audio.ts\nAudioManager]
    settings[Состояние настроек\nAudioSettings]
    screen[Screen\nmenu | play | tests | difficulty | testBattle | test2 | settings]
    menu[Главное меню]
    difficultyScreen[Выбор сложности]
    testBattle[Тест 1\nбой 1 на 1]
    test2[Тест 2\nгексовое поле 12x6]
    placeholders[Заглушка\nИгра]
    settingsScreen[Экран настроек]
    music[Our Mountain — looping MP3\nвнешний URL]
    battleMusic[Preparing for Battle — looping MP3\nвнешний URL]
    soft[public/audio/button-soft.wav]
    arcane[public/audio/button-arcane.wav]
    stone[public/audio/button-stone.wav]
    metal[public/audio/button-metal.wav]
    rune[public/audio/button-rune.wav]
    battleHit[public/audio/battle-hit.wav]
    battleDouble[public/audio/battle-double.wav]
    battleMagic[public/audio/battle-magic.wav]
    battleItem[public/audio/battle-item.wav]
    battleMiss[public/audio/battle-miss.wav]
    battleVictory[public/audio/battle-victory.wav]
    battleDefeat[public/audio/battle-defeat.wav]
    background[public/assets/menu-fantasy-background.png]
    battleBackground[public/assets/battle-castle-corridor.png]
    skeleton[public/assets/skeleton-warrior.png]
    player[public/assets/player-adventurer.png]
    cursorDefault[public/assets/cursor-default.svg]
    cursorPointer[public/assets/cursor-pointer.svg]
    credits[docs/audio-credits.md\nлицензии и источники]
    vite[Vite\nсборка и dev preview]

    browser --> html
    html --> entry
    entry --> styles
    entry --> audio
    entry --> screen
    entry --> settings
    screen --> menu
    screen --> difficultyScreen
    screen --> testBattle
    screen --> test2
    screen --> placeholders
    screen --> settingsScreen
    settingsScreen --> settings
    settings --> audio
    audio --> music
    audio --> battleMusic
    credits --> music
    credits --> battleMusic
    audio --> soft
    audio --> arcane
    audio --> stone
    audio --> metal
    audio --> rune
    audio --> battleHit
    audio --> battleDouble
    audio --> battleMagic
    audio --> battleItem
    audio --> battleMiss
    audio --> battleVictory
    audio --> battleDefeat
    styles --> background
    styles --> battleBackground
    entry --> skeleton
    entry --> player
    styles --> cursorDefault
    styles --> cursorPointer
    vite --> html
    vite --> entry
    vite --> styles
    vite --> background
    vite --> battleBackground
    vite --> skeleton
    vite --> player
    vite --> music
    vite --> battleMusic
```

## 2. Точки входа и ответственность файлов

| Узел | Ответственность | Что не должен знать |
|---|---|---|
| `index.html` | HTML-точка входа и корневой `#app` | Игровые правила и аудиологику |
| `src/main.ts` | Состояние экранов, рендер меню/тестов/двух боевых прототипов/настроек, события UI и боевые правила | Детали аудиофайлов и CSS |
| `src/audio.ts` | Загрузка menu/battle loop-музыки и локальных UI/боевых SFX, громкость, запуск/остановка | Разметку экранов и CSS |
| `src/style.css` | Фон, постоянная анимация фона, карточки, кнопки, бары, курсоры | Переключение экранов и аудиосостояние |
| `public/assets/*` | Визуальные ресурсы | Логику приложения |
| `public/audio/*` | Локальные звуки кнопок и боевые SFX | UI-состояние |
| `docs/audio-credits.md` | Источники и лицензии внешней музыки | Запуск приложения |
| `vite.config.ts` | Dev-сервер и разрешённый preview host | UI и игровой код |

## 3. Контракты между частями

### `Screen`

```text
menu | play | tests | difficulty | testBattle | test2 | settings
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

Музыка меню фиксирована на выбранной loop-версии `Our Mountain` из `MENU_MUSIC_SOURCE`. Выбор темы в настройках отсутствует.

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
  -> проигрывание выбранного звука
```

### Выбор сложности

```text
click на «Тесты»
  -> AudioManager.startMusic()
  -> AudioManager.playButtonSound()
  -> render('tests')
  -> click на «Тест 1 · Бой 1 на 1»
  -> render('difficulty')
  -> отображаются четыре варианта сложности
  -> click на вариант
  -> сохранение выбранной сложности в памяти
  -> AudioManager.startBattleMusic()
  -> создание battleState с модификатором врага
  -> render('testBattle')
```

Модификаторы теста применяются к максимальному HP и диапазону урона скелета: лёгкий `×0.5`, средний `×1`, тяжёлый `×2`, невозможный `×4`. Здоровье игрока, точность и урон его атак остаются базовыми.

### Тест 2: гексовая тактика

```text
click на «Тест 2 · Гексовое поле 12×6»
  -> создаются отряды Рыцарей и Демонов
  -> стартует battle music
  -> render('test2')
  -> выбор Рыцарей и клетки назначения
  -> списание очков действий по расстоянию
  -> движение по подсвеченным клеткам с пошаговой анимацией Рыцарей
  -> клик по Демонам: режим `melee` разрешает удар только с соседней клетки
  -> при достаточном ОД Рыцари сначала доходят до соседней клетки, затем атакуют
  -> кнопка «Исцелить отряд» показывает фактический объём лечения при наведении
  -> действие автоматически завершает ход
  -> ход Демонов: пошаговое движение и атака только по проверке режима `melee`
  -> на поле показываются направление удара, урон и анимированное здоровье отряда
  -> потерянные бойцы проигрывают анимацию гибели; после уничтожения отряда показывается сводка боя
  -> переход к следующему элементу расписания инициативы
```

Расписание одного цикла строится из значений инициативы самих отрядов, а не задано отдельной последовательностью: при значениях 5 и 4 получается пять ходов Рыцарей и четыре хода Демонов. У каждого хода четыре очка действий; порядок виден в верхней полосе интерфейса. В ближнем бою после атаки выполняется ответная атака цели.

### Ход боя

```text
click на действие
  -> проверка шанса попадания
  -> изменение HP цели и запись цветного события в журнал
  -> проигрывание battle SFX
  -> если скелет жив, его ответная атака с шансом 95%
  -> обновление красных HP-баров без прокрутки журнала
```

`Умение` и `Магия` открывают модальное окно. Двойной удар делает две отдельные атаки и получает перезарядку 5 ходов. Лечение восстанавливает 5 HP и получает перезарядку 5 ходов. Предмет использует одну лечебную траву и восстанавливает 3 HP. Боевые действия блокируются на время анимации хода.

Боевая сцена использует полноэкранный `battle-castle-corridor.png` без внешней карточки-рамки; спрайты героя и скелета размещаются поверх сцены.

### Фон

```text
src/style.css
  -> body::before
  -> background-image из menu-fantasy-background.png
  -> animation: background-float
  -> body::after с затемнением
  -> #app с z-index выше слоёв фона
```

Анимация фона сейчас не управляется JavaScript и не имеет настройки выключения: она является постоянной частью визуального слоя. Эта схема восстановлена из ранней рабочей версии прототипа.


## 5. Быстрая диагностика по симптому

| Симптом | Сначала проверить |
|---|---|
| Белый/пустой экран | `index.html`, импорт `src/main.ts`, ошибку сборки TypeScript |
| Меню не появляется | `#app`, `render('menu')`, ошибки в начале `main.ts` |
| Фон исчез | URL `/assets/menu-fantasy-background.png`, `body::before`, `body::after`, `z-index` |
| Фон не двигается | `animation` в `body::before`, `@keyframes background-float`, трансформацию `scale/translate` |
| Музыка не звучит | autoplay-блокировку, `MENU_MUSIC_SOURCE` или `BATTLE_MUSIC_SOURCE`, интернет, `musicVolume` |
| В конце музыки слышна пауза | используется ли loop-версия `Our-Mountain_v003_Looping.mp3` или loop-трек боя |
| Бой не обновляется | `battleState`, `handleBattleAction()`, `animateEnemyTurn()`, выбранный `data-battle-action` |
| Нет боевого эффекта | соответствующий файл `battle-*.wav`, `playBattleSound()`, `buttonSoundVolume` |
| Журнал боя прокручивается | `overflow: hidden` и `LOG_LIMIT` в `src/main.ts` |
| Нет звука кнопок | выбранный `ButtonSound`, путь в `BUTTON_SOUND_FILES`, `buttonSoundVolume`, наличие WAV |
| Смена звука даёт наложение/артефакт | `AudioManager.setSettings()`, `stopButtonSounds()`, повторное использование HTMLAudioElement |
| Ползунок меняется визуально, но громкость нет | `data-setting`, `updateVolumeSetting()`, `AudioManager.applyVolumes()` |
| Настройки выглядят неправильно | `.settings-card`, `.setting-range-row`, `.setting-select` и scrollbar в `src/style.css` |

## 6. Правила для дальнейшего расширения

1. Игровые правила держать отдельно от DOM и Phaser/рендера, когда начнётся разработка самой игры.
2. `AudioManager` не должен решать, на каком экране находится игрок.
3. UI не должен напрямую менять `HTMLAudioElement`; для этого используется `AudioManager`.
4. Для нового экрана сначала добавить состояние и переходы в `main.ts`, затем разметку, затем стили.
5. Для нового аудио добавлять ресурс, тип/label/path и проверять, что preview отдаёт файл с правильным MIME-типом.
6. После каждой структурной правки запускать `npm run build`.
7. При проблеме сначала определить слой: `DOM -> состояние -> AudioManager -> ресурс -> CSS`, а не менять несколько слоёв одновременно.
