FROM --platform=linux/amd64 maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache deps
COPY pom.xml ./pom.xml
COPY blog-client/pom.xml ./blog-client/pom.xml
COPY blog-domain/pom.xml ./blog-domain/pom.xml
COPY blog-infra/pom.xml ./blog-infra/pom.xml
COPY blog-app/pom.xml ./blog-app/pom.xml
COPY blog-adapter/pom.xml ./blog-adapter/pom.xml
COPY blog-start/pom.xml ./blog-start/pom.xml

RUN mvn -q -DskipTests dependency:go-offline

# Build
COPY . .
RUN mvn -q -DskipTests package

FROM --platform=linux/amd64 eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/blog-start/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
