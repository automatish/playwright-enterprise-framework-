import type { Page } from '@playwright/test';
import { SignInPage } from './auth/sign-in.page';
import { BankAccountsPage } from './banking/bank-accounts.page';
import { NewTransactionPage } from './banking/new-transaction.page';
import { TransactionsFeedPage } from './banking/transactions-feed.page';
import { AlertBarComponent } from './components/alert-bar.component';
import { GlobalHeaderComponent } from './components/global-header.component';
import { SideNavComponent } from './components/side-nav.component';

/**
 * Lazily-constructed page-object graph for one browser page. Specs receive a
 * single `app` and navigate the domain (`app.newTransaction.pay(...)`) instead
 * of juggling page-object constructors.
 */
export class BankingApp {
  constructor(readonly page: Page) {}

  get signIn(): SignInPage {
    return new SignInPage(this.page);
  }
  get feed(): TransactionsFeedPage {
    return new TransactionsFeedPage(this.page);
  }
  get newTransaction(): NewTransactionPage {
    return new NewTransactionPage(this.page);
  }
  get bankAccounts(): BankAccountsPage {
    return new BankAccountsPage(this.page);
  }
  get header(): GlobalHeaderComponent {
    return new GlobalHeaderComponent(this.page);
  }
  get sideNav(): SideNavComponent {
    return new SideNavComponent(this.page);
  }
  get toast(): AlertBarComponent {
    return new AlertBarComponent(this.page);
  }
}
