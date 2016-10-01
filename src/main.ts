import { sayHello } from "./greet";

function showHello(divName: string, name: string) {
    const elt = document.getElementById(divName);
    elt.textContent = sayHello(name);
}

showHello("greeting", "TypeScript");
