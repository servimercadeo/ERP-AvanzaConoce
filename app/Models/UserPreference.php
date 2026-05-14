<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPreference extends Model
{
    protected $table    = 'user_preferences';
    protected $fillable = ['user_id', 'preferences'];
    protected $casts    = ['preferences' => 'array'];
}
