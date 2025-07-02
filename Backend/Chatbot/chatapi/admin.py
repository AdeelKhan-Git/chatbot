from django.contrib import admin
from .models import KnowledgeBase,UploadRecord
# from django.contrib.auth.models import User

# Register your models here.

@admin.register(KnowledgeBase)
class AdminKnowledgeBase(admin.ModelAdmin):
    list_display = ['id','question']


@admin.register(UploadRecord)
class AdminUpload(admin.ModelAdmin):
    list_display = ['id', 'file_name','uploaded_by','uploaded_at']