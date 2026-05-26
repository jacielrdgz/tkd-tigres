<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud recibida</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 40px 20px;
    }
    .wrapper {
      max-width: 560px;
      margin: 0 auto;
    }
    .card {
      background: #1e293b;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      padding: 40px 32px;
      text-align: center;
    }
    .icon-circle {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .header p {
      font-size: 14px;
      color: rgba(255,255,255,0.75);
      margin-top: 6px;
    }
    .body {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      color: #e2e8f0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .steps {
      background: #0f172a;
      border-radius: 12px;
      border: 1px solid #334155;
      padding: 20px;
      margin-bottom: 28px;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 6px 0;
    }
    .step-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      color: #fff;
      flex-shrink: 0;
    }
    .step-dot.done { background: #22c55e; }
    .step-dot.pending { background: #3b82f6; }
    .step-dot.inactive { background: #334155; color: #64748b; }
    .step-label strong { display: block; font-size: 13px; color: #e2e8f0; }
    .step-label span { font-size: 12px; color: #64748b; }
    .step-line {
      width: 1px;
      height: 14px;
      background: #334155;
      margin: 2px 0 2px 13px;
    }
    .info-box {
      background: rgba(59,130,246,0.08);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .info-box p {
      font-size: 13px;
      color: #93c5fd;
      line-height: 1.6;
    }
    .info-box strong { color: #bfdbfe; }
    .footer-note {
      font-size: 12px;
      color: #475569;
      text-align: center;
      margin-top: 24px;
      line-height: 1.6;
    }
    .footer {
      border-top: 1px solid #334155;
      padding: 20px 32px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: #475569;
    }
    .app-name {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Encabezado -->
      <div class="header">
        <div class="icon-circle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1>¡Solicitud recibida!</h1>
        <p>Tu registro está pendiente de aprobación</p>
      </div>

      <!-- Cuerpo -->
      <div class="body">
        <p class="greeting">Hola, <strong>{{ $nombreUsuario }}</strong> 👋</p>
        <p class="text">
          Hemos recibido correctamente tu solicitud de acceso para la escuela
          <strong style="color: #e2e8f0;">{{ $nombreEscuela }}</strong>.
          El administrador revisará tu solicitud y activará tu cuenta en breve.
        </p>

        <!-- Pasos -->
        <div class="steps">
          <div class="step">
            <div class="step-dot done">✓</div>
            <div class="step-label">
              <strong>Solicitud recibida</strong>
              <span>Tu información fue guardada correctamente</span>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="step">
            <div class="step-dot pending">2</div>
            <div class="step-label">
              <strong>Revisión del administrador</strong>
              <span>Se asignará tu escuela y rol</span>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="step">
            <div class="step-dot inactive">3</div>
            <div class="step-label">
              <strong>Cuenta activada</strong>
              <span>Recibirás otro correo cuando esté lista</span>
            </div>
          </div>
        </div>

        <!-- Caja de info -->
        <div class="info-box">
          <p>
            Una vez que el administrador active tu cuenta, podrás
            <strong>iniciar sesión normalmente</strong> con tu correo y contraseña.
            No necesitas hacer nada más por ahora.
          </p>
        </div>

        <p class="footer-note">
          Si no solicitaste este registro, puedes ignorar este correo.<br/>
          Tu cuenta no será activada sin aprobación manual.
        </p>
      </div>

      <!-- Pie -->
      <div class="footer">
        <p>Este correo fue enviado automáticamente</p>
        <p class="app-name">{{ config('app.name') }}</p>
      </div>
    </div>
  </div>
</body>
</html>
