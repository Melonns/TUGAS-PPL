<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabel untuk logbooks aktivitas harian mahasiswa
     */
    public function up(): void
    {
        Schema::create('logbooks', function (Blueprint $table) {
            $table->id('id_logbooks');
            $table->unsignedBigInteger('user_id'); // Intern
            $table->date('tanggal');
            $table->text('deskripsi_kegiatan'); // Rich text / textarea untuk deskripsi harian
            $table->json('bukti_kegiatan')->nullable(); // File evidence array
            $table->enum('status_verifikasi', ['draft', 'pending', 'verified', 'revision_needed'])->default('draft');
            $table->unsignedBigInteger('verified_by')->nullable(); // Mentor yang verifikasi
            $table->unsignedBigInteger('revision_by')->nullable(); // Who requested revision
            $table->text('feedback')->nullable(); // Catatan dari mentor
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('revision_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('verified_by')->references('user_id')->on('users')->onDelete('set null');
            $table->foreign('revision_by')->references('user_id')->on('users')->onDelete('set null');
            
            // Indexes for performance
            $table->index('user_id');
            $table->index('tanggal');
            $table->index('status_verifikasi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('logbooks');
    }
};
