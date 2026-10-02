# 1. Aşama: Derleme (SDK)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Proje dosyalarını kopyala ve bağımlılıkları yükle (restore)
COPY ["DevShowcase.API/DevShowcase.API.csproj", "DevShowcase.API/"]
COPY ["DevShowcase.Business/DevShowcase.Business.csproj", "DevShowcase.Business/"]
COPY ["DevShowcase.Core/DevShowcase.Core.csproj", "DevShowcase.Core/"]
COPY ["DevShowcase.DataAccess/DevShowcase.DataAccess.csproj", "DevShowcase.DataAccess/"]

RUN dotnet restore "DevShowcase.API/DevShowcase.API.csproj"

# Tüm kodları kopyala ve Release modunda derle
COPY . .
WORKDIR "/src/DevShowcase.API"
RUN dotnet publish "DevShowcase.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Aşama: Çalıştırma (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render'ın varsayılan portu 8080'dir
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DevShowcase.API.dll"]