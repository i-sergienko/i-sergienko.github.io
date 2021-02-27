import {Injectable} from '@angular/core';
import {ArticlePreview} from './model/article-preview';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import md from 'markdown-it';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private markdown = md();

  constructor(private http: HttpClient) {
  }

  getArticleMetadata(): Observable<ArticlePreview[]> {
    return this.http.get<ArticlePreview[]>(`/assets/posts/articles.json`, {responseType: 'json'});
  }

  getArticleByName(articleName: string): Observable<string> {
    return this.http.get(`/assets/posts/${articleName}.md`, {responseType: 'text'})
      .pipe(map((article: string) => this.markdown.render(article)));
  }
}
