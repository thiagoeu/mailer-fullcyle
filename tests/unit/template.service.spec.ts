import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from '../../src/modules/mailer/services/template.service';
import { NotFoundError } from '../../src/shared/errors/not-found-error';

describe('TemplateService (Unit)', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = TemplateService.getInstance();
    templateService.clearCache();
  });

  it('deve renderizar o template welcome.hbs com variaveis dinamicas', async () => {
    const html = await templateService.render('welcome', {
      name: 'Thiago Teste',
      actionUrl: 'https://exemplo.com/ativar',
    });

    expect(html).toContain('Bem-vindo ao Sistema, Thiago Teste!');
    expect(html).toContain('Ola <strong>Thiago Teste</strong>,');
    expect(html).toContain('https://exemplo.com/ativar');
  });

  it('deve utilizar o cache em memoria na segunda chamada do mesmo template', async () => {
    const htmlFirst = await templateService.render('welcome', { name: 'Primeiro' });
    const htmlSecond = await templateService.render('welcome', { name: 'Segundo' });

    expect(htmlFirst).toContain('Primeiro');
    expect(htmlSecond).toContain('Segundo');
  });

  it('deve renderizar o template password-reset.hbs com codigo e tempo de expiracao', async () => {
    const html = await templateService.render('password-reset', {
      name: 'Carlos',
      code: '849201',
      expiresInMinutes: 15,
      resetUrl: 'https://exemplo.com/reset',
    });

    expect(html).toContain('Recuperacao de Senha');
    expect(html).toContain('849201');
    expect(html).toContain('Valido por 15 minutos');
    expect(html).toContain('https://exemplo.com/reset');
  });

  it('deve renderizar o template order-confirmation.hbs com dados do pedido e valor total', async () => {
    const html = await templateService.render('order-confirmation', {
      customerName: 'Beatriz',
      orderNumber: 'PED-99881',
      orderDate: '12/11/2026',
      totalAmount: '259,90',
      shippingAddress: 'Av. Paulista, 1000 - SP',
      estimatedDelivery: '3 dias uteis',
    });

    expect(html).toContain('Pedido Confirmado!');
    expect(html).toContain('Pedido #PED-99881');
    expect(html).toContain('R$ 259,90');
    expect(html).toContain('Beatriz');
  });

  it('deve renderizar o template security-alert.hbs com informacoes de IP e dispositivo', async () => {
    const html = await templateService.render('security-alert', {
      userName: 'Thiago',
      timestamp: '12/11/2026 15:30',
      device: 'Chrome / Windows',
      ipAddress: '189.40.10.25',
      location: 'Sao Paulo, Brasil',
      secureAccountUrl: 'https://exemplo.com/seguranca',
    });

    expect(html).toContain('Alerta de Seguranca: Novo Acesso Detectado');
    expect(html).toContain('189.40.10.25');
    expect(html).toContain('Chrome / Windows');
    expect(html).toContain('https://exemplo.com/seguranca');
  });

  it('deve lancar NotFoundError quando o template nao existir no disco', async () => {
    await expect(templateService.render('template-inexistente', {})).rejects.toThrow(NotFoundError);
  });
});

