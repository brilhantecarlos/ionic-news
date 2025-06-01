import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from 'src/app/firebase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {

  email = '';
  senha = '';
  mensagemErro = '';

  constructor(private router: Router) {}

  ngOnInit() {}

  async login() {
    this.mensagemErro = '';

    if (!this.email || !this.senha) {
      this.mensagemErro = 'Preencha email e senha.';
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        this.email,
        this.senha
      );
      console.log('Usuário logado:', userCredential.user);
      this.router.navigate(['/general']);
    } catch (error: any) {
      console.error(error);
      this.mensagemErro = this.traduzErro(error.code);
    }
  }

  traduzErro(codigo: string): string {
    switch (codigo) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      case 'auth/invalid-email':
        return 'Email inválido.';
      default:
        return 'Erro ao fazer login. Tente novamente.';
    }
  }
}
