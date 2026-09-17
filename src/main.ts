import './style.css';

type Screen = 'menu' | 'play' | 'tests' | 'settings';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Не найден корневой элемент приложения.');
}

const app = appElement;

const placeholderScreens: Record<Exclude<Screen, 'menu'>, { title: string; text: string }> = {
  play: {
    title: 'Игра',
    text: 'Игровой экран пока не добавлен.',
  },
  tests: {
    title: 'Тесты',
    text: 'Раздел тестов пока пуст.',
  },
  settings: {
    title: 'Настройки',
    text: 'Раздел настроек пока пуст.',
  },
};

function render(screen: Screen): void {
  if (screen === 'menu') {
    app.innerHTML = `
      <main class="screen" aria-labelledby="menu-title">
        <section class="menu-card">
          <p class="eyebrow">Прототип</p>
          <h1 id="menu-title">Главное меню</h1>
          <nav class="menu-actions" aria-label="Основные разделы">
            <button class="menu-button" type="button" data-screen="play">Играть</button>
            <button class="menu-button" type="button" data-screen="tests">Тесты</button>
            <button class="menu-button" type="button" data-screen="settings">Настройки</button>
          </nav>
        </section>
      </main>
    `;
    return;
  }

  const placeholder = placeholderScreens[screen];

  app.innerHTML = `
    <main class="screen" aria-labelledby="placeholder-title">
      <section class="menu-card placeholder-card">
        <p class="eyebrow">Прототип</p>
        <h1 id="placeholder-title">${placeholder.title}</h1>
        <p class="placeholder-text">${placeholder.text}</p>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

app.addEventListener('click', (event: MouseEvent) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const nextScreen = target.dataset.screen as Screen | undefined;

  if (nextScreen) {
    render(nextScreen);
  }
});

render('menu');
