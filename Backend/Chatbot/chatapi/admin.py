from django.contrib import admin
from .models import KnowledgeBase,UploadRecord,ChatMessage
# from django.contrib.auth.models import User

# Register your models here.

@admin.register(KnowledgeBase)
class AdminKnowledgeBase(admin.ModelAdmin):
    list_display = ['id','question']


@admin.register(UploadRecord)
class AdminUpload(admin.ModelAdmin):
    list_display = ['id', 'file_name','uploaded_by','uploaded_at']

@admin.register(ChatMessage)
class AdminChatmessage(admin.ModelAdmin):
    list_display = ['id', 'user','role']