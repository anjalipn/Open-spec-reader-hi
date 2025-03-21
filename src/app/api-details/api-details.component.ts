import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiEndpoint } from '../models/api-endpoint.interface';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-api-details',
  templateUrl: './api-details.component.html',
  styleUrls: ['./api-details.component.scss']
})
export class ApiDetailsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  apiDetailsForm: FormGroup;
  endpoints: ApiEndpoint[] = [];
  columnWidths: { [key: string]: number } = {
    signature: 25,
    resourceInPayload: 15,
    resourceInUrl: 15,
    crValidationRequired: 10,
    incidentValidation: 10,
    changeInPayload: 15,
    changeInUrl: 15,
    incidentInPayload: 15,
    incidentInUrl: 15,
    estimatedTime: 10
  };
  expandedColumn: string | null = null;
  displayedColumns: string[] = [
    'signature',
    'resourceInPayload',
    'resourceInUrl',
    'crValidationRequired',
    'incidentValidation',
    'changeInPayload',
    'changeInUrl',
    'incidentInPayload',
    'incidentInUrl',
    'estimatedTime'
  ];
  dataSource!: MatTableDataSource<any>;

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
    this.route.queryParams.subscribe((params: { [key: string]: string | undefined }) => {
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

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
          incidentValidationRequired: this.checkIncidentValidationRequired(path, details),
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

    // Initialize the Material table data source
    this.dataSource = new MatTableDataSource(this.endpointsFormArray.controls);
    console.log('Parsed endpoints:', this.endpoints);
  }

  private checkResourceInPayload(details: any): string {
    // First check examples as they take precedence
    const examples = details.requestBody?.content?.['application/json']?.examples;
    if (examples) {
      for (const example of Object.values(examples)) {
        const value = (example as any).value;
        const resourceFields = ['server', 'serverId', 'resource', 'resourceId', 'host', 'hostname'];
        const path = this.findFieldPath(value, resourceFields);
        if (path) return path;
      }
    }

    // If no examples found or no resource field in examples, check schema
    const schema = details.requestBody?.content?.['application/json']?.schema;
    if (schema) {
      const resourceFields = ['server', 'serverId', 'resource', 'resourceId', 'host', 'hostname'];
      return this.findFieldPath(schema, resourceFields);
    }

    return '';
  }

  private findFieldPath(obj: any, fields: string[], currentPath: string = ''): string {
    if (!obj) return '';

    // Handle $ref
    if (obj.$ref) {
      const resolvedRef = this.resolveReference(obj.$ref);
      if (resolvedRef) {
        return this.findFieldPath(resolvedRef, fields, currentPath);
      }
      return '';
    }

    // For schemas, only check property names
    if (obj.properties) {
      for (const [key, value] of Object.entries(obj.properties)) {
        if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          return key;
        }
      }
      return '';
    }

    // For examples and other objects, do full traversal
    if (typeof obj === 'string') {
      if (fields.some(field => obj.toLowerCase().includes(field.toLowerCase()))) {
        return currentPath;
      }
      return '';
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const foundPath = this.findFieldPath(obj[i], fields, currentPath);
        if (foundPath) return foundPath;
      }
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const foundPath = this.findFieldPath(value, fields, newPath);
        if (foundPath) return foundPath;
      }
    }

    return '';
  }

  private resolveReference(ref: string): any {
    // Remove the #/ prefix if present
    const path = ref.startsWith('#/') ? ref.substring(2) : ref;
    
    // Split the path into segments
    const segments = path.split('/');
    
    // Get the root OpenAPI spec from the route state
    let current = this.route.snapshot.queryParams['yamlContent'];
    if (current) {
      try {
        current = JSON.parse(decodeURIComponent(current));
      } catch (error) {
        console.error('Error parsing YAML content:', error);
        return null;
      }
    } else {
      return null;
    }

    // Traverse the object following the path segments
    for (const segment of segments) {
      if (current && typeof current === 'object') {
        current = current[segment];
      } else {
        return null;
      }
    }

    return current;
  }

  private checkResourceInUrl(path: string): string {
    const resourceFields = ['server', 'serverId', 'resource', 'resourceId', 'host', 'hostname'];
    for (const field of resourceFields) {
      if (path.toLowerCase().includes(field.toLowerCase())) {
        return `{${field}}`;
      }
    }
    return '';
  }

  private checkCrValidationRequired(path: string, details: any): boolean {
    return !!this.checkResourceInPayload(details) || !!this.checkResourceInUrl(path);
  }

  private checkIncidentValidationRequired(path: string, details: any): boolean {
    return !!(this.checkIncidentInPayload(details) || this.checkIncidentInUrl(path));
  }

  private checkChangeInPayload(details: any): string {
    // First check examples as they take precedence
    const examples = details.requestBody?.content?.['application/json']?.examples;
    if (examples) {
      for (const example of Object.values(examples)) {
        const value = (example as any).value;
        const path = this.findChangePatternPath(value);
        if (path) return path;
      }
    }

    // If no examples found or no change pattern in examples, check schema
    const schema = details.requestBody?.content?.['application/json']?.schema;
    if (schema) {
      const changeFields = ['changeRecord', 'change', 'crnumber', 'cr'];
      return this.findFieldPath(schema, changeFields);
    }

    return '';
  }

  private findChangePatternPath(obj: any, currentPath: string = ''): string {
    if (!obj) return '';

    // Handle $ref
    if (obj.$ref) {
      const resolvedRef = this.resolveReference(obj.$ref);
      if (resolvedRef) {
        return this.findChangePatternPath(resolvedRef, currentPath);
      }
      return '';
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('CHG') || obj.startsWith('CR')) {
        return currentPath;
      }
      return '';
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const foundPath = this.findChangePatternPath(obj[i], currentPath);
        if (foundPath) return foundPath;
      }
      return '';
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const foundPath = this.findChangePatternPath(value, newPath);
        if (foundPath) return foundPath;
      }
    }

    return '';
  }

  private checkChangeInUrl(path: string): string {
    const changeFields = ['changeRecord', 'change', 'crnumber', 'cr'];
    
    // Split the path into segments
    const segments = path.split('/');
    
    // Check each segment for change-related path parameters
    for (const segment of segments) {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        const paramName = segment.slice(1, -1); // Remove { and }
        if (changeFields.some(field => paramName.toLowerCase().includes(field.toLowerCase()))) {
          return segment; // Return the path parameter with curly braces
        }
      }
    }
    
    return '';
  }

  private checkIncidentInPayload(details: any): string {
    // First check examples as they take precedence
    const examples = details.requestBody?.content?.['application/json']?.examples;
    if (examples) {
      for (const example of Object.values(examples)) {
        const value = (example as any).value;
        const path = this.findIncidentPatternPath(value);
        if (path) return path;
      }
    }

    // If no examples found or no incident pattern in examples, check schema
    const schema = details.requestBody?.content?.['application/json']?.schema;
    if (schema) {
      const incidentFields = ['incidentRecord', 'incident', 'innumber', 'in'];
      return this.findFieldPath(schema, incidentFields);
    }

    return '';
  }

  private findIncidentPatternPath(obj: any, currentPath: string = ''): string {
    if (!obj) return '';

    // Handle $ref
    if (obj.$ref) {
      const resolvedRef = this.resolveReference(obj.$ref);
      if (resolvedRef) {
        return this.findIncidentPatternPath(resolvedRef, currentPath);
      }
      return '';
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('IN')) {
        return currentPath;
      }
      return '';
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const foundPath = this.findIncidentPatternPath(obj[i], currentPath);
        if (foundPath) return foundPath;
      }
      return '';
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const foundPath = this.findIncidentPatternPath(value, newPath);
        if (foundPath) return foundPath;
      }
    }

    return '';
  }

  private checkIncidentInUrl(path: string): string {
    const incidentFields = ['incidentRecord', 'incident', 'innumber', 'in'];
    
    // Split the path into segments
    const segments = path.split('/');
    
    // Check each segment for incident-related path parameters
    for (const segment of segments) {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        const paramName = segment.slice(1, -1); // Remove { and }
        if (incidentFields.some(field => paramName.toLowerCase().includes(field.toLowerCase()))) {
          return segment; // Return the path parameter with curly braces
        }
      }
    }
    
    return '';
  }

  private createEndpointFormGroup(endpoint: ApiEndpoint): FormGroup {
    return this.fb.group({
      signature: [endpoint.signature],
      resourceInPayload: [endpoint.resourceInPayload],
      resourceInPayloadPath: [''],
      resourceInUrl: [endpoint.resourceInUrl],
      resourceInUrlPath: [''],
      crValidationRequired: [endpoint.crValidationRequired],
      incidentValidation: [endpoint.incidentValidationRequired],
      changeInPayload: [endpoint.changeInPayload],
      changeInPayloadPath: [''],
      changeInUrl: [endpoint.changeInUrl],
      changeInUrlPath: [''],
      incidentInPayload: [endpoint.incidentInPayload],
      incidentInPayloadPath: [''],
      incidentInUrl: [endpoint.incidentInUrl],
      incidentInUrlPath: [''],
      estimatedTime: [endpoint.estimatedTime, [Validators.required, Validators.min(1)]]
    });
  }

  toggleResourcePath(event: any, index: number, field: string): void {
    const control = this.endpointsFormArray.at(index);
    const isChecked = event.target.checked;
    control.get(field)?.setValue(isChecked);
    
    // Clear the path when unchecked
    if (!isChecked) {
      control.get(`${field}Path`)?.setValue('');
    }
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

  toggleColumn(column: string): void {
    if (this.expandedColumn === column) {
      this.expandedColumn = null;
      // Reset all columns to their default widths
      Object.keys(this.columnWidths).forEach(key => {
        this.columnWidths[key] = this.getDefaultColumnWidth(key);
      });
    } else {
      this.expandedColumn = column;
      // Expand the clicked column and adjust others
      const totalWidth = 100;
      const expandedWidth = 40; // Width for expanded column
      const remainingColumns = Object.keys(this.columnWidths).filter(key => key !== column);
      const remainingWidth = totalWidth - expandedWidth;
      
      this.columnWidths[column] = expandedWidth;
      const remainingColumnCount = remainingColumns.length;
      const widthPerRemainingColumn = remainingWidth / remainingColumnCount;
      
      remainingColumns.forEach(key => {
        this.columnWidths[key] = widthPerRemainingColumn;
      });
    }
  }

  private getDefaultColumnWidth(column: string): number {
    const defaultWidths: { [key: string]: number } = {
      signature: 25,
      resourceInPayload: 15,
      resourceInUrl: 15,
      crValidationRequired: 10,
      incidentValidation: 10,
      changeInPayload: 15,
      changeInUrl: 15,
      incidentInPayload: 15,
      incidentInUrl: 15,
      estimatedTime: 10
    };
    return defaultWidths[column] || 10;
  }

  getColumnWidth(column: string): string {
    return `${this.columnWidths[column]}%`;
  }

  isColumnExpanded(column: string): boolean {
    return this.expandedColumn === column;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
