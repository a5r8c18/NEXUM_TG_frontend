import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Message {
  id: string;
  companyId: number;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  sentAt: string;
  readAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/messages`;

  getInbox() {
    return this.http.get<Message[]>(`${this.baseUrl}/inbox`);
  }

  getSent() {
    return this.http.get<Message[]>(`${this.baseUrl}/sent`);
  }

  getUnreadCount() {
    return this.http.get<{ unreadCount: number }>(`${this.baseUrl}/unread-count`);
  }

  getMessage(id: string) {
    return this.http.get<Message>(`${this.baseUrl}/${id}`);
  }

  send(data: { toUserId: string; toUserName: string; fromUserId: string; fromUserName: string; subject: string; body: string; priority?: string }) {
    return this.http.post<Message>(this.baseUrl, data);
  }

  markAsRead(id: string) {
    return this.http.put<Message>(`${this.baseUrl}/${id}/read`, {});
  }

  archive(id: string) {
    return this.http.put<Message>(`${this.baseUrl}/${id}/archive`, {});
  }

  remove(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
