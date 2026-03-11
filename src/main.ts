import './styles.css';
import { Game } from './game/Game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Elemento #app não encontrado.');
}

const game = new Game(app);
game.start();

window.addEventListener('beforeunload', () => game.dispose());
