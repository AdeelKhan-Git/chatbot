from django.db import models
from django.contrib.auth.models import User
# Create your models here.

class KnowledgeBase(models.Model):
    question = models.TextField()
    answer = models.TextField()
  

class UploadRecord(models.Model):
    file_name= models.CharField(max_length=200)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    inserted = models.PositiveIntegerField()
    skipped = models.PositiveIntegerField()


    def __str__(self):

        return f'{self.file_name} - {self.uploaded_by} - {self.uploaded_at}'