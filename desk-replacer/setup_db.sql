CREATE DATABASE DeskDB;
GO

USE DeskDB;
GO

CREATE TABLE Tickets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'Baixo'
    -- You can add more columns here if desired:
    -- created_at DATETIME DEFAULT GETDATE(),
    -- priority NVARCHAR(50) DEFAULT 'Normal'
);
GO
