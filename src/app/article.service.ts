import {Injectable} from '@angular/core';
import {ArticlePreview} from './model/article-preview';
import {Observable, of} from 'rxjs';
import md from 'markdown-it';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private markdown = md();
  private ARTICLES: ArticlePreview[] = [
    {title: 'Writing a Kubernetes operator', description: 'Go edition'},
    {title: 'Writing a Kubernetes operator', description: 'Java edition'},
    {title: 'Writing a Kubernetes operator', description: 'Rust edition'}
  ]; // Placeholder articles. To be replaced with real ones from github repo

  constructor() {
  }

  getArticlePreviews(): Observable<ArticlePreview[]> {
    return of(this.ARTICLES);
  }

  getArticleByName(articleName: string): Observable<string> {
    return of(this.markdown.render('```TODO fetch post by name from assets```'));
  }
}
