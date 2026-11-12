import fs from 'node:fs/promises';
import path from 'node:path';
import handlebars from 'handlebars';
import { NotFoundError } from '../../../shared/errors/not-found-error';

export class TemplateService {
  private static instance: TemplateService;
  private templateCache: Map<string, handlebars.TemplateDelegate> = new Map();
  private viewsDirectory: string;

  constructor() {
    this.viewsDirectory = path.resolve(__dirname, '../templates/views');
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Renderiza um template Handlebars a partir do nome e contexto de variaveis.
   * Utiliza cache em memoria para nao reler e recompilar o arquivo a cada envio.
   */
  async render(templateName: string, variables: Record<string, any> = {}): Promise<string> {
    const cleanTemplateName = templateName.replace(/\.hbs$/, '');

    // 1. Verifica no cache em memoria
    const cachedDelegate = this.templateCache.get(cleanTemplateName);
    if (cachedDelegate) {
      return cachedDelegate(variables);
    }

    // 2. Busca o arquivo em disco
    const filePath = path.join(this.viewsDirectory, `${cleanTemplateName}.hbs`);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const compiledDelegate = handlebars.compile(fileContent);

      // 3. Salva no cache em memoria para futuros envios
      this.templateCache.set(cleanTemplateName, compiledDelegate);

      return compiledDelegate(variables);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundError(`Template de e-mail "${cleanTemplateName}" nao foi encontrado no disco.`);
      }
      throw error;
    }
  }

  /**
   * Limpa o cache de templates (util em testes ou atualizacoes a quente)
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

