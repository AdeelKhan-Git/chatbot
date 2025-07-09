from .views import ChatBotAPIView,UploadFileView,LoginView,UserProfileView,UploadedDataListView
from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

urlpatterns = [
    path('chat/',ChatBotAPIView.as_view(), name = 'chatbotresponse'), 
    path('upload_file/',UploadFileView.as_view(), name = 'uploadfile'),
    path('file_records',UploadedDataListView.as_view(), name= 'record_list'),
    path('login/',LoginView.as_view(), name = 'login'),  
    path('profile/',UserProfileView.as_view(), name = 'profile'),  
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),  
]