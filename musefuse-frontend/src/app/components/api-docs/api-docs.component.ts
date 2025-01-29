import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-api-docs',
  template: `
    <div class="api-docs-container">
      <markdown [data]="markdownContent"></markdown>
    </div>
  `,
  styles: [`
    .api-docs-container {
      max-width: 1000px;
      margin: 20px auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    :host ::ng-deep {
      h1, h2, h3 { 
        color: #333;
        margin-top: 1.5em;
      }
      
      code {
        background: #f5f5f5;
        padding: 2px 4px;
        border-radius: 4px;
      }
      
      pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        overflow-x: auto;
      }
    }
  `]
})
export class ApiDocsComponent implements OnInit {
  markdownContent = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get('/assets/API-docs.md', { responseType: 'text' })
      .subscribe(content => {
        this.markdownContent = content;
      });
  }
} 