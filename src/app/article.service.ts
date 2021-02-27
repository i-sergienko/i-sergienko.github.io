import {Injectable} from '@angular/core';
import {ArticlePreview} from './model/article-preview';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import md from 'markdown-it';
import {HttpClient} from '@angular/common/http';
import {Article} from './model/article';

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

  getArticleByName(articleName: string): Observable<Article> {
    const article: Observable<ArticlePreview> = this.getArticleMetadata()
      .pipe(map((articles: ArticlePreview[]) => articles.filter(a => a.name === articleName)[0]));
    const html = this.http.get(`/assets/posts/${articleName}.md`, {responseType: 'text'})
      .pipe(map((content: string) => this.markdown.render(content)));

    return forkJoin({
      metadata: article,
      content: html
    });
  }
}
