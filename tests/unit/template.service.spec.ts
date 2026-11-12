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

  it('deve lancar NotFoundError quando o template nao existir no disco', async () => {
    await expect(templateService.render('template-inexistente', {})).rejects.toThrow(NotFoundError);
  });
});

