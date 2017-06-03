import React from 'react';
import ReactDOM from 'react-dom';
import Game from './lib/components/Game'

const loadDOM = () => {
    return new Promise(resolve => {
        window.addEventListener('DOMContentLoaded', resolve);
    });
};

(async () => {
    await loadDOM();
    ReactDOM.render(
        <Game/>,
        document.getElementById("root")
    );
})();