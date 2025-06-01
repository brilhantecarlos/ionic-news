import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from 'src/app/firebase';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  standalone: false,
})
export class CadastroPage implements OnInit {
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  mensagemErro = '';

  constructor(private router: Router) {}

  ngOnInit() {}

  async cadastrar() {
    this.mensagemErro = '';

    if (this.senha !== this.confirmarSenha) {
      this.mensagemErro = 'As senhas não conferem.';
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        this.email,
        this.senha
      );

      await updateProfile(userCredential.user, {
        displayName: this.nome,
      });

      console.log('Usuário criado:', userCredential.user);
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error(error);
      this.mensagemErro = this.traduzErro(error.code);
    }
  }

  traduzErro(codigo: string): string {
    switch (codigo) {
      case 'auth/email-already-in-use':
        return 'Este email já está em uso.';
      case 'auth/invalid-email':
        return 'Email inválido.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      default:
        return 'Erro ao criar conta. Tente novamente.';
    }
  }
}
