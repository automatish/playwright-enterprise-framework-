import type { Locator } from '@playwright/test';
import { BasePage } from '@core/base.page';
import { GlobalHeaderComponent } from '@pages/components/global-header.component';
import { SideNavComponent } from '@pages/components/side-nav.component';
import { TransactionTableComponent } from '@pages/components/transaction-table.component';

/** Home screen: Everyone / Friends / Mine transaction feeds. */
export class TransactionsFeedPage extends BasePage {
  protected readonly path = '/';

  readonly header = new GlobalHeaderComponent(this.page);
  readonly sideNav = new SideNavComponent(this.page);
  readonly table = new TransactionTableComponent(this.page);

  protected readyIndicator(): Locator {
    return this.header.tab('Everyone');
  }
}
