import {Injectable} from '@angular/core';
import {ArticlePreview} from './model/article-preview';
import {Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
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
}
