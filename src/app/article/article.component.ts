import {Component, OnInit} from '@angular/core';
import {ArticleService} from '../article.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css']
})
export class ArticleComponent implements OnInit {
  renderedArticle: string;

  constructor(
    private route: ActivatedRoute,
    public articleService: ArticleService
  ) {
  }

  ngOnInit(): void {
    const articleName = this.route.snapshot.paramMap.get('id');

    this.articleService.getArticleByName(articleName)
      .subscribe(article => this.renderedArticle = article);
  }

}
