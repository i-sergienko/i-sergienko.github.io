import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ArticleListComponent} from './article-list/article-list.component';
import {AboutComponent} from './about/about.component';

const routes: Routes = [
  {path: '', redirectTo: '/articles', pathMatch: 'full'},
  {path: 'articles', component: ArticleListComponent},
  {path: 'about', component: AboutComponent},
  {path: 'articles/:name', component: ArticleListComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
