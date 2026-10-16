import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { of } from 'rxjs';
import { TareaService } from './services/tarea.service';
import { StorageService } from './services/storage.service';

describe('AppComponent', () => {
  const tareas = [
    {
      id: 101,
      curso: 'Desarrollo de Software PWA',
      titulo: 'Configuración de Service Worker',
      instructor: 'Ing. Jorge Luis',
      fechaEntrega: '2026-10-15',
      estado: 'Pendiente'
    }
  ];
  const storageService = jasmine.createSpyObj<StorageService>('StorageService', [
    'guardarEntregaLocal',
    'obtenerEntregasPendientes',
    'guardarTareasCache',
    'obtenerTareasCache'
  ]);

  beforeEach(async () => {
    localStorage.removeItem('senatiTaskHub.demoUser');
    storageService.guardarEntregaLocal.and.returnValue(Promise.resolve());
    storageService.obtenerEntregasPendientes.and.returnValue(Promise.resolve([]));
    storageService.guardarTareasCache.and.returnValue(Promise.resolve());
    storageService.obtenerTareasCache.and.returnValue(Promise.resolve([]));
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: TareaService, useValue: { obtenerTareas: () => of(tareas) } },
        { provide: StorageService, useValue: storageService }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('senatiTaskHub.demoUser');
    storageService.guardarEntregaLocal.calls.reset();
    storageService.obtenerEntregasPendientes.calls.reset();
    storageService.guardarTareasCache.calls.reset();
    storageService.obtenerTareasCache.calls.reset();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it("should have the 'SENATI TaskHub' title", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('SENATI TaskHub');
  });

  it('should render the task catalog', () => {
    localStorage.setItem('senatiTaskHub.demoUser', 'test@senati.pe');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Organiza tus entregas');
    expect(compiled.querySelectorAll('.task-card').length).toBe(1);
    localStorage.removeItem('senatiTaskHub.demoUser');
  });

  it('should persist an offline delivery locally', async () => {
    localStorage.setItem('senatiTaskHub.demoUser', 'test@senati.pe');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.actualizarEstadoOffline();
    app.comentarioEntrega = 'Avance del laboratorio';

    await app.enviarEntrega();

    expect(storageService.guardarEntregaLocal).toHaveBeenCalledWith({
      tareaId: 101,
      comentario: 'Avance del laboratorio',
      usuario: 'Test',
      archivos: []
    });
    expect(app.mensajeNotificacion).toContain('estado PENDIENTE');
    expect(app.comentarioEntrega).toBe('');
  });

  it('should allow saving a file without a comment', async () => {
    localStorage.setItem('senatiTaskHub.demoUser', 'test@senati.pe');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.archivosSeleccionados = [new File(['contenido'], 'avance.pdf', { type: 'application/pdf' })];

    await app.enviarEntrega();

    expect(storageService.guardarEntregaLocal).toHaveBeenCalledWith(jasmine.objectContaining({
      tareaId: 101,
      comentario: '',
      archivos: [jasmine.objectContaining({ nombre: 'avance.pdf', tipo: 'application/pdf' })]
    }));
    expect(app.archivosSeleccionados).toEqual([]);
    localStorage.removeItem('senatiTaskHub.demoUser');
  });

  it('should start a local demo session and keep it in local storage', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.correo = 'ESTUDIANTE@SENATI.PE';
    app.contrasena = 'demo-password';

    app.iniciarSesion();

    expect(app.autenticado).toBeTrue();
    expect(app.usuario).toBe('Estudiante');
    expect(localStorage.getItem('senatiTaskHub.demoUser')).toBe('ESTUDIANTE@SENATI.PE');
    app.cerrarSesion();
  });

  it('should show a readable name for email local parts with separators', () => {
    const fixture = TestBed.createComponent(AppComponent);
    localStorage.setItem('senatiTaskHub.demoUser', 'JUAN.PEREZ@SENATI.PE');

    fixture.detectChanges();

    expect(fixture.componentInstance.usuario).toBe('Juan Perez');
    localStorage.removeItem('senatiTaskHub.demoUser');
  });
});
