import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiEndpoint } from '../models/api-endpoint.interface';

@Component({
  selector: 'app-api-details',
  templateUrl: './api-details.component.html',
  styleUrls: ['./api-details.component.scss']
})
export class ApiDetailsComponent implements OnInit {
  apiDetailsForm: FormGroup;
  endpoints: ApiEndpoint[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.apiDetailsForm = this.fb.group({
      endpoints: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Get the YAML content from the route state
    this.route.queryParams.subscribe(params => {
      if (params['yamlContent']) {
        try {
          const yamlContent = JSON.parse(decodeURIComponent(params['yamlContent']));
          console.log('Received YAML content:', yamlContent);
          this.parseYamlContent(yamlContent);
        } catch (error) {
          console.error('Error parsing YAML content:', error);
          this.router.navigate(['/api-config']);
        }
      } else {
        console.error('No YAML content found in route params');
        this.router.navigate(['/api-config']);
      }
    });
  }

  private parseYamlContent(yamlContent: any): void {
    if (!yamlContent?.paths) {
      console.error('Invalid YAML content: missing paths');
      return;
    }

    // Clear existing endpoints
    this.endpoints = [];
    while (this.endpointsFormArray.length) {
      this.endpointsFormArray.removeAt(0);
    }

    Object.entries(yamlContent.paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, details]: [string, any]) => {
        const endpoint: ApiEndpoint = {
          signature: `${path}:${method.toUpperCase()}`,
          resourceInPayload: this.checkResourceInPayload(details),
          resourceInUrl: this.checkResourceInUrl(path),
          crValidationRequired: this.checkCrValidationRequired(path, details),
          incidentValidation: false, // Default value
          changeInPayload: this.checkChangeInPayload(details),
          changeInUrl: this.checkChangeInUrl(path),
          incidentInPayload: this.checkIncidentInPayload(details),
          incidentInUrl: this.checkIncidentInUrl(path),
          estimatedTime: 30 // Default value
        };
        this.endpoints.push(endpoint);
        this.endpointsFormArray.push(this.createEndpointFormGroup(endpoint));
      });
    });

    console.log('Parsed endpoints:', this.endpoints);
  }

  private checkResourceInPayload(details: any): boolean {
    const requestBody = details.requestBody?.content?.['application/json']?.schema;
    if (!requestBody) return false;

    const resourceFields = ['server', 'serverId', 'resource', 'resourceId', 'host', 'hostname'];
    return this.checkFieldsInObject(requestBody, resourceFields);
  }

  private checkResourceInUrl(path: string): boolean {
    const resourceFields = ['server', 'serverId', 'resource', 'resourceId', 'host', 'hostname'];
    return resourceFields.some(field => 
      path.toLowerCase().includes(field.toLowerCase())
    );
  }

  private checkCrValidationRequired(path: string, details: any): boolean {
    return this.checkResourceInPayload(details) || this.checkResourceInUrl(path);
  }

  private checkChangeInPayload(details: any): boolean {
    const examples = details.requestBody?.content?.['application/json']?.examples;
    if (!examples) return false;

    return Object.values(examples).some((example: any) => {
      const value = example.value;
      return this.checkForChangePattern(value);
    });
  }

  private checkChangeInUrl(path: string): boolean {
    return path.toUpperCase().includes('CHG');
  }

  private checkIncidentInPayload(details: any): boolean {
    const examples = details.requestBody?.content?.['application/json']?.examples;
    if (!examples) return false;

    return Object.values(examples).some((example: any) => {
      const value = example.value;
      return this.checkForIncidentPattern(value);
    });
  }

  private checkIncidentInUrl(path: string): boolean {
    return path.toUpperCase().includes('INC');
  }

  private checkForChangePattern(value: any): boolean {
    if (typeof value === 'string') {
      return value.startsWith('CHG');
    }
    if (typeof value === 'object') {
      return Object.values(value).some(v => this.checkForChangePattern(v));
    }
    return false;
  }

  private checkForIncidentPattern(value: any): boolean {
    if (typeof value === 'string') {
      return value.startsWith('INC');
    }
    if (typeof value === 'object') {
      return Object.values(value).some(v => this.checkForIncidentPattern(v));
    }
    return false;
  }

  private checkFieldsInObject(obj: any, fields: string[]): boolean {
    if (!obj) return false;

    if (obj.properties) {
      return Object.keys(obj.properties).some(key => 
        fields.some(field => key.toLowerCase().includes(field.toLowerCase()))
      );
    }

    if (Array.isArray(obj)) {
      return obj.some(item => this.checkFieldsInObject(item, fields));
    }

    if (typeof obj === 'object') {
      return Object.values(obj).some(value => this.checkFieldsInObject(value, fields));
    }

    return false;
  }

  private createEndpointFormGroup(endpoint: ApiEndpoint): FormGroup {
    return this.fb.group({
      signature: [endpoint.signature],
      resourceInPayload: [endpoint.resourceInPayload],
      resourceInUrl: [endpoint.resourceInUrl],
      crValidationRequired: [endpoint.crValidationRequired],
      incidentValidation: [endpoint.incidentValidation],
      changeInPayload: [endpoint.changeInPayload],
      changeInUrl: [endpoint.changeInUrl],
      incidentInPayload: [endpoint.incidentInPayload],
      incidentInUrl: [endpoint.incidentInUrl],
      estimatedTime: [endpoint.estimatedTime, [Validators.required, Validators.min(1)]]
    });
  }

  get endpointsFormArray(): FormArray {
    return this.apiDetailsForm.get('endpoints') as FormArray;
  }

  onSubmit(): void {
    if (this.apiDetailsForm.valid) {
      console.log('Form submitted:', this.apiDetailsForm.value);
      // Handle form submission
    }
  }
}
