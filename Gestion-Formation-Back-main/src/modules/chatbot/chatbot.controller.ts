import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('ask')
  @UseGuards(ManualJwtGuard)
  async ask(@Body() body: { question: string }, @Req() req: any) {
    const { question } = body;
    const role = req.user?.role || 'participant';
    const userId = req.user?.sub;
    const result = await this.chatbotService.ask(question, role, userId);
    return result;
  }
}
