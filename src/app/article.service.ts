import {Injectable} from '@angular/core';
import {ArticlePreview} from './model/article-preview';
import {Observable, of, throwError} from 'rxjs';
import {catchError, map, retry} from 'rxjs/operators';
import md from 'markdown-it';
import {HttpClient} from '@angular/common/http';

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

  constructor(private http: HttpClient) {
  }

  getArticlePreviews(): Observable<ArticlePreview[]> {
    return of(this.ARTICLES);
  }

  getArticleByName(articleName: string): Observable<string> {
    return this.http.get(`/assets/posts/${articleName}.md`, {responseType: 'text'})
      .pipe(map((article: string) => this.markdown.render(article)));
  }
}
