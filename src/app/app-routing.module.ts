import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ArticleListComponent} from './article-list/article-list.component';

const routes: Routes = [
  {path: '', redirectTo: '/articles', pathMatch: 'full'},
  {path: 'articles', component: ArticleListComponent},
  {path: 'about', component: ArticleListComponent},
  {path: 'articles/:name', component: ArticleListComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
