import { describe, it, expect } from 'vitest';
import { SendEmailSchema } from '../../src/modules/mailer/dtos/send-email.dto';

describe('SendEmailSchema (Unit)', () => {
  it('deve validar com sucesso um payload contendo body direto', () => {
    const validData = {
      to: 'cliente@exemplo.com',
      subject: 'Assunto do e-mail',
      body: '<p>Ola mundo</p>',
    };

    const parsed = SendEmailSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('deve validar com sucesso um payload contendo template e variaveis', () => {
    const validData = {
      to: 'cliente@exemplo.com',
      subject: 'Assunto do e-mail',
      template: 'welcome',
      templateVariables: { name: 'Thiago' },
    };

    const parsed = SendEmailSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('deve rejeitar se o destinatario (to) for um e-mail invalido', () => {
    const invalidData = {
      to: 'email-invalido',
      subject: 'Assunto',
      body: 'Conteudo',
    };

    const parsed = SendEmailSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('deve rejeitar se nem body nem template forem fornecidos (regra de refinamento)', () => {
    const invalidData = {
      to: 'cliente@exemplo.com',
      subject: 'Assunto sem corpo',
    };

    const parsed = SendEmailSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('E necessario fornecer o corpo do e-mail (body) ou o nome de um template (template).');
    }
  });
});

