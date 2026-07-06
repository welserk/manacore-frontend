// Componente raiz: solo arma el marco (header + pagina + footer)
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header';
import { Footer } from './layout/footer';
import { CarritoDrawer } from './layout/carrito-drawer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, CarritoDrawer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
