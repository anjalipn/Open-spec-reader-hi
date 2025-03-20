import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as yaml from 'js-yaml';

interface OpenApiSpec {
  paths?: {
    [path: string]: {
      [method: string]: {
        requestBody?: {
          content?: {
            'application/json'?: {
              schema?: any;
              examples?: any;
            };
          };
        };
      };
    };
  };
}

@Component({
  selector: 'app-api-config',
  templateUrl: './api-config.component.html',
  styleUrls: ['./api-config.component.scss']
})
export class ApiConfigComponent {
  apiConfigForm: FormGroup;
  selectedFile: File | null = null;
  fileError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.apiConfigForm = this.fb.group({
      apiName: ['', [Validators.required]],
      apiSpec: [null, [Validators.required]]
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'yaml' || fileExtension === 'yml') {
        this.selectedFile = file;
        this.fileError = null;
        this.apiConfigForm.patchValue({
          apiSpec: this.selectedFile
        });
      } else {
        this.selectedFile = null;
        this.fileError = 'Please select a valid YAML file (.yaml or .yml)';
        this.apiConfigForm.patchValue({
          apiSpec: null
        });
      }
    }
  }

  onSubmit(): void {
    if (this.apiConfigForm.valid && this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const yamlContent = yaml.load(e.target?.result as string) as OpenApiSpec;
          console.log('Parsed YAML content:', yamlContent);
          
          if (!yamlContent?.paths) {
            this.fileError = 'Invalid OpenAPI specification: missing paths';
            return;
          }

          // Encode the YAML content for URL
          const encodedContent = encodeURIComponent(JSON.stringify(yamlContent));
          
          // Navigate to the details page with query params
          this.router.navigate(['/api-details'], {
            queryParams: { yamlContent: encodedContent }
          });
        } catch (error) {
          console.error('YAML parsing error:', error);
          this.fileError = 'Invalid YAML file format';
        }
      };
      reader.readAsText(this.selectedFile);
    }
  }

  get apiName() {
    return this.apiConfigForm.get('apiName');
  }

  get apiSpec() {
    return this.apiConfigForm.get('apiSpec');
  }
}
